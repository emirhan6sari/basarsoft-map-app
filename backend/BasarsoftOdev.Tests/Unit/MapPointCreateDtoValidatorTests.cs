using BasarsoftOdev.BLL.Dtos;
using BasarsoftOdev.BLL.Validators;
using FluentAssertions;
using FluentValidation.TestHelper;

namespace BasarsoftOdev.Tests.Unit;

public class MapPointCreateDtoValidatorTests
{
    private readonly MapPointCreateDtoValidator _validator = new();

    [Fact]
    public void Valid_Wgs84_ShouldNotHaveErrors()
    {
        var dto = new MapPointCreateDto
        {
            Name = "Test",
            Number = "T-1",
            Category = "Depo",
            Longitude = 32.5,
            Latitude = 39.9,
        };

        var result = _validator.TestValidate(dto);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void MissingCoordinates_ShouldHaveError()
    {
        var dto = new MapPointCreateDto
        {
            Name = "Test",
            Number = "T-1",
            Category = "Depo",
        };

        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x);
    }

    [Fact]
    public void LongitudeOutOfRange_ShouldHaveError()
    {
        var dto = new MapPointCreateDto
        {
            Name = "Test",
            Number = "T-1",
            Category = "Depo",
            Longitude = 181,
            Latitude = 39,
        };

        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.Longitude);
    }
}
