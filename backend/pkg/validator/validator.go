package validator

import (
	"fmt"
	"reflect"
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
)

var validate *validator.Validate

var (
	phoneRegex    = regexp.MustCompile(`^\+?[0-9\s\-()]{7,20}$`)
	usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)
)

func init() {
	validate = validator.New()

	// Use JSON tag names in error messages instead of struct field names
	validate.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})

	// Custom validator for international phone numbers
	_ = validate.RegisterValidation("phone", func(fl validator.FieldLevel) bool {
		return phoneRegex.MatchString(fl.Field().String())
	})

	// Custom validator for username characters (alphanumeric, underscores, hyphens)
	_ = validate.RegisterValidation("username", func(fl validator.FieldLevel) bool {
		return usernameRegex.MatchString(fl.Field().String())
	})
}

// FieldError represents a specific field-level validation failure.
type FieldError struct {
	Field   string `json:"field"`
	Tag     string `json:"tag"`
	Message string `json:"message"`
}

// ValidationErrors is a slice of FieldErrors implementing the error interface.
type ValidationErrors []FieldError

func (v ValidationErrors) Error() string {
	var msgs []string
	for _, err := range v {
		msgs = append(msgs, err.Message)
	}
	return strings.Join(msgs, "; ")
}

// ValidateStruct validates any struct and returns a list of human-friendly FieldError objects.
func ValidateStruct(s any) ValidationErrors {
	err := validate.Struct(s)
	if err == nil {
		return nil
	}

	var errors ValidationErrors
	if valErrors, ok := err.(validator.ValidationErrors); ok {
		for _, e := range valErrors {
			errors = append(errors, FieldError{
				Field:   e.Field(),
				Tag:     e.Tag(),
				Message: formatErrorMessage(e),
			})
		}
	} else {
		errors = append(errors, FieldError{
			Field:   "general",
			Tag:     "invalid",
			Message: err.Error(),
		})
	}

	return errors
}

// formatErrorMessage generates user-friendly validation messages.
func formatErrorMessage(e validator.FieldError) string {
	field := e.Field()
	switch e.Tag() {
	case "required":
		return fmt.Sprintf("%s is required", field)
	case "email":
		return fmt.Sprintf("%s must be a valid email address", field)
	case "min":
		return fmt.Sprintf("%s must be at least %s characters long", field, e.Param())
	case "max":
		return fmt.Sprintf("%s must be at most %s characters long", field, e.Param())
	case "phone":
		return fmt.Sprintf("%s must be a valid phone number", field)
	case "username":
		return fmt.Sprintf("%s can only contain letters, numbers, underscores, and hyphens", field)
	case "alphanum":
		return fmt.Sprintf("%s must contain only alphanumeric characters", field)
	case "len":
		return fmt.Sprintf("%s must be exactly %s characters long", field, e.Param())
	default:
		return fmt.Sprintf("%s failed validation on '%s'", field, e.Tag())
	}
}
