// Package hardening reduces how a process holding session keys can be
// inspected by other processes of the same user. On Windows the server runs in
// a child created with protected security descriptors (see RunProtected), so
// no other process of the user, its parent included, can read its memory or
// take over its threads. Administrators with SeDebugPrivilege are not stopped.
package hardening

import (
	"errors"
	"fmt"
	"unsafe"

	"golang.org/x/sys/windows"
)

// Rights other processes of the user keep. Enough to wait for, identify and
// stop the server, never to read its memory or run code in it.
const (
	allowedProcessAccess = windows.SYNCHRONIZE | windows.PROCESS_QUERY_LIMITED_INFORMATION |
		windows.PROCESS_TERMINATE
	allowedThreadAccess = windows.SYNCHRONIZE | windows.READ_CONTROL | windows.THREAD_QUERY_LIMITED_INFORMATION
	// For objects created without a descriptor, such as the Go runtime's
	// threads; plain standard rights suit every object type.
	allowedDefaultAccess = windows.SYNCHRONIZE | windows.READ_CONTROL
)

// Apply protects the current process: its DACL, the default DACL of its token
// and the DACLs of its threads. The report also says whether RunProtected
// started this process protected, which no later step can make up for.
func Apply() Report {
	var report Report

	user, err := currentUser()
	if err != nil {
		report.add(err)

		return report
	}

	switch {
	case launch.child:
		// Checked before restrictProcess rewrites the DACL.
		report.add(verifyCreatedProtected())
	case launch.problem != nil:
		report.add(launch.problem)
	default:
		report.add(errors.New("not started by the protected launcher, so other processes may hold full access to it"))
	}

	report.add(restrictDefaultDACL(user))
	report.add(restrictProcess(user))
	report.add(restrictThreads(user))

	return report
}

func currentUser() (*windows.SID, error) {
	user, err := windows.GetCurrentProcessToken().GetTokenUser()
	if err != nil {
		return nil, fmt.Errorf("read process user: %w", err)
	}

	return user.User.Sid, nil
}

// limitedACL grants access to user and to OWNER RIGHTS; the latter removes the
// owner's implicit right to rewrite the DACL. withSystem adds full access for
// SYSTEM, as the default DACL of every token has.
func limitedACL(user *windows.SID, access windows.ACCESS_MASK, withSystem bool) (*windows.ACL, error) {
	ownerRights, err := windows.CreateWellKnownSid(windows.WinCreatorOwnerRightsSid)
	if err != nil {
		return nil, fmt.Errorf("owner rights sid: %w", err)
	}

	entries := []windows.EXPLICIT_ACCESS{explicitAccess(user, access), explicitAccess(ownerRights, access)}

	if withSystem {
		system, sidErr := windows.CreateWellKnownSid(windows.WinLocalSystemSid)
		if sidErr != nil {
			return nil, fmt.Errorf("system sid: %w", sidErr)
		}

		entries = append(entries, explicitAccess(system, windows.GENERIC_ALL))
	}

	acl, err := windows.ACLFromEntries(entries, nil)
	if err != nil {
		return nil, fmt.Errorf("build dacl: %w", err)
	}

	return acl, nil
}

func explicitAccess(sid *windows.SID, access windows.ACCESS_MASK) windows.EXPLICIT_ACCESS {
	return windows.EXPLICIT_ACCESS{
		AccessPermissions: access,
		AccessMode:        windows.GRANT_ACCESS,
		Inheritance:       windows.NO_INHERITANCE,
		Trustee: windows.TRUSTEE{
			TrusteeForm:  windows.TRUSTEE_IS_SID,
			TrusteeType:  windows.TRUSTEE_IS_UNKNOWN,
			TrusteeValue: windows.TrusteeValueFromSID(sid),
		},
	}
}

// tokenDefaultDACL mirrors TOKEN_DEFAULT_DACL.
type tokenDefaultDACL struct {
	DefaultDacl *windows.ACL
}

// restrictDefaultDACL limits what other processes get on objects this process
// creates later without a descriptor. Child processes inherit a copy of the
// token, and with it this default.
func restrictDefaultDACL(user *windows.SID) error {
	acl, err := limitedACL(user, allowedDefaultAccess, true)
	if err != nil {
		return fmt.Errorf("restrict default dacl: %w", err)
	}

	var token windows.Token
	if err := windows.OpenProcessToken(windows.CurrentProcess(), windows.TOKEN_ADJUST_DEFAULT|windows.TOKEN_QUERY,
		&token); err != nil {
		return fmt.Errorf("restrict default dacl: open token: %w", err)
	}

	defer func() { _ = token.Close() }()

	info := tokenDefaultDACL{DefaultDacl: acl}
	if err := windows.SetTokenInformation(token, windows.TokenDefaultDacl, (*byte)(unsafe.Pointer(&info)),
		uint32(unsafe.Sizeof(info))); err != nil {
		return fmt.Errorf("restrict default dacl: %w", err)
	}

	return nil
}

// restrictProcess replaces the process DACL. Handles opened before this call
// keep their access, which is why the server is started protected instead.
func restrictProcess(user *windows.SID) error {
	acl, err := limitedACL(user, allowedProcessAccess, false)
	if err != nil {
		return fmt.Errorf("restrict process: %w", err)
	}

	if err := windows.SetSecurityInfo(windows.CurrentProcess(), windows.SE_KERNEL_OBJECT,
		windows.DACL_SECURITY_INFORMATION|windows.PROTECTED_DACL_SECURITY_INFORMATION, nil, nil, acl, nil); err != nil {
		return fmt.Errorf("set process dacl: %w", err)
	}

	return nil
}

// restrictThreads limits the threads that already exist; later ones get the
// restricted default DACL.
func restrictThreads(user *windows.SID) error {
	acl, err := limitedACL(user, allowedThreadAccess, false)
	if err != nil {
		return fmt.Errorf("restrict threads: %w", err)
	}

	threads, err := threadsOf(windows.GetCurrentProcessId())
	if err != nil {
		return fmt.Errorf("restrict threads: %w", err)
	}

	var errs []error

	for _, tid := range threads {
		if threadErr := restrictThread(tid, acl); threadErr != nil {
			errs = append(errs, fmt.Errorf("thread %d: %w", tid, threadErr))
		}
	}

	if len(errs) > 0 {
		return fmt.Errorf("restrict threads: %w", errors.Join(errs...))
	}

	return nil
}

func restrictThread(tid uint32, acl *windows.ACL) error {
	thread, err := windows.OpenThread(windows.WRITE_DAC, false, tid)

	switch {
	case errors.Is(err, windows.ERROR_INVALID_PARAMETER):
		return nil // the thread exited
	case errors.Is(err, windows.ERROR_ACCESS_DENIED):
		// Only a restrictive OWNER RIGHTS entry takes WRITE_DAC from the owner;
		// confirm it is ours.
		return verifyThread(tid)
	case err != nil:
		return err
	}

	defer windows.CloseHandle(thread) //nolint:errcheck // nothing to do if closing fails

	return windows.SetSecurityInfo(thread, windows.SE_KERNEL_OBJECT,
		windows.DACL_SECURITY_INFORMATION|windows.PROTECTED_DACL_SECURITY_INFORMATION, nil, nil, acl, nil)
}

func verifyThread(tid uint32) error {
	thread, err := windows.OpenThread(windows.READ_CONTROL, false, tid)
	if errors.Is(err, windows.ERROR_INVALID_PARAMETER) {
		return nil
	}

	if err != nil {
		return fmt.Errorf("read thread dacl: %w", err)
	}

	defer windows.CloseHandle(thread) //nolint:errcheck // nothing to do if closing fails

	return verifyObjectDACL(thread, allowedThreadAccess)
}

// threadsOf lists the thread ids of process pid.
func threadsOf(pid uint32) ([]uint32, error) {
	snapshot, err := windows.CreateToolhelp32Snapshot(windows.TH32CS_SNAPTHREAD, 0)
	if err != nil {
		return nil, fmt.Errorf("snapshot threads: %w", err)
	}

	defer windows.CloseHandle(snapshot) //nolint:errcheck // nothing to do if closing fails

	entry := windows.ThreadEntry32{Size: uint32(unsafe.Sizeof(windows.ThreadEntry32{}))}

	var threads []uint32

	for err = windows.Thread32First(snapshot, &entry); err == nil; err = windows.Thread32Next(snapshot, &entry) {
		if entry.OwnerProcessID == pid {
			threads = append(threads, entry.ThreadID)
		}
	}

	if !errors.Is(err, windows.ERROR_NO_MORE_FILES) {
		return nil, fmt.Errorf("list threads: %w", err)
	}

	return threads, nil
}

// verifyCreatedProtected confirms this process was created with the protected
// descriptor and token default RunProtected set, and not merely given its
// environment marker.
func verifyCreatedProtected() error {
	if err := verifyObjectDACL(windows.CurrentProcess(), allowedProcessAccess); err != nil {
		return fmt.Errorf("started without a protected process descriptor: %w", err)
	}

	dacl, err := currentDefaultDACL()
	if err != nil {
		return fmt.Errorf("read default dacl: %w", err)
	}

	if err := grantsAtMost(dacl, allowedDefaultAccess); err != nil {
		return fmt.Errorf("started without a restricted default dacl: %w", err)
	}

	return nil
}

func verifyObjectDACL(handle windows.Handle, allowed windows.ACCESS_MASK) error {
	sd, err := windows.GetSecurityInfo(handle, windows.SE_KERNEL_OBJECT, windows.DACL_SECURITY_INFORMATION)
	if err != nil {
		return fmt.Errorf("read dacl: %w", err)
	}

	dacl, _, err := sd.DACL()
	if err != nil {
		return fmt.Errorf("read dacl: %w", err)
	}

	return grantsAtMost(dacl, allowed)
}

func currentDefaultDACL() (*windows.ACL, error) {
	token := windows.GetCurrentProcessToken()

	size := uint32(256)

	for {
		buf := make([]byte, size)

		err := windows.GetTokenInformation(token, windows.TokenDefaultDacl, &buf[0], size, &size)
		if err == nil {
			return (*tokenDefaultDACL)(unsafe.Pointer(&buf[0])).DefaultDacl, nil
		}

		if !errors.Is(err, windows.ERROR_INSUFFICIENT_BUFFER) || int(size) <= len(buf) {
			return nil, err
		}
	}
}

// grantsAtMost fails when acl is missing (everyone has full access) or allows
// anyone but SYSTEM more than allowed.
func grantsAtMost(acl *windows.ACL, allowed windows.ACCESS_MASK) error {
	if acl == nil {
		return errors.New("no dacl, so everyone has full access")
	}

	system, err := windows.CreateWellKnownSid(windows.WinLocalSystemSid)
	if err != nil {
		return fmt.Errorf("system sid: %w", err)
	}

	for i := range uint32(acl.AceCount) {
		var ace *windows.ACCESS_ALLOWED_ACE
		if aceErr := windows.GetAce(acl, i, &ace); aceErr != nil {
			return fmt.Errorf("read ace %d: %w", i, aceErr)
		}

		if ace.Header.AceType != windows.ACCESS_ALLOWED_ACE_TYPE {
			continue
		}

		sid := (*windows.SID)(unsafe.Pointer(&ace.SidStart))
		if sid.Equals(system) {
			continue
		}

		if extra := ace.Mask &^ allowed; extra != 0 {
			return fmt.Errorf("%s is granted %#x beyond %#x", sid.String(), uint32(extra), uint32(allowed))
		}
	}

	return nil
}
