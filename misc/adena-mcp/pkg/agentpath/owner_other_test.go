//go:build !unix

package agentpath

import "os"

type foreignDir struct{ os.FileInfo }
