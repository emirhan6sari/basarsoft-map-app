using BasarsoftOdev.BLL.Dtos;
using FluentValidation;

namespace BasarsoftOdev.BLL.Validators;

public class MapPointImportRequestValidator : AbstractValidator<MapPointImportRequestDto>
{
    private static readonly string[] AllowedFormats = ["geojson", "json", "wkt"];

    public MapPointImportRequestValidator()
    {
        RuleFor(x => x.Format)
            .NotEmpty()
            .Must(f => AllowedFormats.Contains(f.Trim().ToLowerInvariant()))
            .WithMessage("Format 'geojson' veya 'wkt' olmalıdır.");

        RuleFor(x => x.Content).NotEmpty().MaximumLength(2_000_000);
        RuleFor(x => x.Category).NotEmpty().MaximumLength(32);
        RuleFor(x => x.NamePrefix).NotEmpty().MaximumLength(100);
        RuleFor(x => x.NumberPrefix).NotEmpty().MaximumLength(40);
        RuleFor(x => x.DefaultDescription).MaximumLength(2000).When(x => x.DefaultDescription is not null);
    }
}
