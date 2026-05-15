using BasarsoftOdev.BLL.Exceptions;
using BasarsoftOdev.BLL.Services;
using FluentAssertions;

namespace BasarsoftOdev.Tests.Unit;

public class CoordinateTransformationServiceTests
{
    private readonly CoordinateTransformationService _sut = new();

    [Fact]
    public void FromWgs84_AnkaraApprox_ReturnsMercator()
    {
        var result = _sut.FromWgs84(32.85, 39.92);

        result.Longitude.Should().BeApproximately(32.85, 0.001);
        result.Latitude.Should().BeApproximately(39.92, 0.001);
        result.XMercator.Should().BeGreaterThan(3_600_000);
        result.YMercator.Should().BeGreaterThan(4_800_000);
    }

    [Fact]
    public void FromWebMercator_RoundTripsToWgs84()
    {
        var original = _sut.FromWgs84(29.0, 41.0);
        var roundTrip = _sut.FromWebMercator(original.XMercator, original.YMercator);

        roundTrip.Longitude.Should().BeApproximately(29.0, 0.0001);
        roundTrip.Latitude.Should().BeApproximately(41.0, 0.0001);
    }

    [Fact]
    public void Resolve_Wgs84Only_FillsMercator()
    {
        var result = _sut.Resolve(28.97, 41.01, null, null);

        result.XMercator.Should().NotBe(0);
        result.YMercator.Should().NotBe(0);
    }

    [Fact]
    public void Resolve_MismatchedSystems_ThrowsBusinessException()
    {
        var act = () => _sut.Resolve(32.0, 39.0, 100.0, 200.0);

        act.Should().Throw<BusinessException>()
            .Where(e => e.Message.Contains("uyumsuz"));
    }

    [Fact]
    public void FromWgs84_InvalidLongitude_Throws()
    {
        var act = () => _sut.FromWgs84(200, 40);

        act.Should().Throw<BusinessException>();
    }
}
