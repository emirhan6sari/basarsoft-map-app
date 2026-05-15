using BasarsoftOdev.BLL.Dtos;
using FluentValidation;

namespace BasarsoftOdev.BLL.Validators;

public class MapPointCreateDtoValidator : AbstractValidator<MapPointCreateDto>
{
    public MapPointCreateDtoValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Number).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Description).MaximumLength(2000).When(x => x.Description is not null);
        RuleFor(x => x.Category).NotEmpty().MaximumLength(32);

        RuleFor(x => x)
            .Must(d => Has4326(d) || Has3857(d))
            .WithMessage("EPSG:4326 (longitude/latitude) veya EPSG:3857 (xMercator/yMercator) gönderilmelidir.");

        When(Has4326, () =>
        {
            RuleFor(x => x.Longitude).InclusiveBetween(-180, 180);
            RuleFor(x => x.Latitude).InclusiveBetween(-90, 90);
        });

        When(d => Has4326(d) && Has3857(d), () =>
        {
            RuleFor(x => x.XMercator).NotNull();
            RuleFor(x => x.YMercator).NotNull();
        });
    }

    private static bool Has4326(MapPointCreateDto d) => d.Longitude.HasValue && d.Latitude.HasValue;
    private static bool Has3857(MapPointCreateDto d) => d.XMercator.HasValue && d.YMercator.HasValue;
}

public class MapPointUpdateDtoValidator : AbstractValidator<MapPointUpdateDto>
{
    public MapPointUpdateDtoValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Number).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Description).MaximumLength(2000).When(x => x.Description is not null);
        RuleFor(x => x.Category).NotEmpty().MaximumLength(32);
        RuleFor(x => x)
            .Must(d => (d.Longitude.HasValue && d.Latitude.HasValue) || (d.XMercator.HasValue && d.YMercator.HasValue))
            .WithMessage("EPSG:4326 veya EPSG:3857 koordinatları gönderilmelidir.");
    }
}
