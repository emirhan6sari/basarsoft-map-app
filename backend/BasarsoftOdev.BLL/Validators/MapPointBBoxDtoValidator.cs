using BasarsoftOdev.BLL.Dtos;
using FluentValidation;

namespace BasarsoftOdev.BLL.Validators;

public class MapPointBBoxDtoValidator : AbstractValidator<MapPointBBoxDto>
{
    public MapPointBBoxDtoValidator()
    {
        RuleFor(x => x.MinLongitude).InclusiveBetween(-180, 180);
        RuleFor(x => x.MaxLongitude).InclusiveBetween(-180, 180);
        RuleFor(x => x.MinLatitude).InclusiveBetween(-90, 90);
        RuleFor(x => x.MaxLatitude).InclusiveBetween(-90, 90);
        RuleFor(x => x)
            .Must(b => b.MinLongitude <= b.MaxLongitude)
            .WithMessage("minLon maxLon değerinden büyük olamaz.");
        RuleFor(x => x)
            .Must(b => b.MinLatitude <= b.MaxLatitude)
            .WithMessage("minLat maxLat değerinden büyük olamaz.");
    }
}
