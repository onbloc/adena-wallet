package hardening

import "errors"

// Report lists the hardening steps that did not take effect. An empty report
// means the process is protected as far as this package can protect it.
type Report struct {
	Problems []string
}

// Full reports whether every hardening step succeeded.
func (r Report) Full() bool {
	return len(r.Problems) == 0
}

// Err joins the problems into one error, or returns nil when Full.
func (r Report) Err() error {
	errs := make([]error, 0, len(r.Problems))
	for _, problem := range r.Problems {
		errs = append(errs, errors.New(problem))
	}

	return errors.Join(errs...)
}

func (r *Report) add(err error) {
	if err != nil {
		r.Problems = append(r.Problems, err.Error())
	}
}
