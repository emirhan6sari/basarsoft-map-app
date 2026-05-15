using BasarsoftOdev.BLL.Dtos;
using FluentValidation;

namespace BasarsoftOdev.BLL.Validators;

public class LoginRequestDtoValidator : AbstractValidator<LoginRequestDto>
{
    public LoginRequestDtoValidator()
    {
        RuleFor(x => x.UserName)
            .NotEmpty().WithMessage("Kullanıcı adı zorunludur.")
            .MaximumLength(100).WithMessage("Kullanıcı adı en fazla 100 karakter olabilir.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Şifre zorunludur.");
    }
}

public class RegisterRequestDtoValidator : AbstractValidator<RegisterRequestDto>
{
    public RegisterRequestDtoValidator()
    {
        RuleFor(x => x.UserName)
            .NotEmpty().WithMessage("Kullanıcı adı zorunludur.")
            .MaximumLength(100).WithMessage("Kullanıcı adı en fazla 100 karakter olabilir.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Şifre zorunludur.")
            .MinimumLength(6).WithMessage("Şifre en az 6 karakter olmalıdır.");

        RuleFor(x => x.DisplayName)
            .MaximumLength(200).WithMessage("Görünen ad en fazla 200 karakter olabilir.")
            .When(x => x.DisplayName is not null);
    }
}

public class RefreshTokenRequestDtoValidator : AbstractValidator<RefreshTokenRequestDto>
{
    public RefreshTokenRequestDtoValidator()
    {
        RuleFor(x => x.RefreshToken).NotEmpty().WithMessage("Refresh token zorunludur.");
    }
}
