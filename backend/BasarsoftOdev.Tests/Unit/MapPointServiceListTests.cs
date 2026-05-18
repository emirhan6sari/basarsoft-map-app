using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Dtos;
using BasarsoftOdev.BLL.Interfaces;
using BasarsoftOdev.BLL.Options;
using BasarsoftOdev.BLL.Services;
using BasarsoftOdev.BLL.Services.MapPoints;
using BasarsoftOdev.DAL.AppLogging;
using GeoGeometryParser = BasarsoftOdev.BLL.Services.GeoGeometryParser;
using BasarsoftOdev.Domain.Entities;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace BasarsoftOdev.Tests.Unit;

public class MapPointServiceListTests
{
    private static MapPointService CreateSut(
        Mock<IMapPointQueryRepository> queryRepo,
        int bboxMax = 100,
        int listMax = 50)
    {
        var commandRepo = new Mock<IMapPointCommandRepository>(MockBehavior.Loose);
        var coords = new CoordinateTransformationService();
        var geo = new Mock<IGeoGeometryParser>(MockBehavior.Loose);
        var options = Options.Create(new MapSettings
        {
            BboxMaxResults = bboxMax,
            ListMaxResults = listMax,
            ProximityRadiusMeters = 50,
        });

        var listQueries = new IMapPointListQuery[]
        {
            new AdminMapPointListQuery(queryRepo.Object),
            new UserMapPointListQuery(queryRepo.Object),
        };

        return new MapPointService(
            queryRepo.Object,
            commandRepo.Object,
            coords,
            geo.Object,
            new MapPointAccessPolicyResolver(new AdminMapPointAccessPolicy(), new UserMapPointAccessPolicy()),
            new MapPointListQuerySelector(listQueries),
            NullLogger<MapPointService>.Instance,
            new NullAppLogWriter(),
            options);
    }

    [Fact]
    public async Task ListAsync_WhenTotalExceedsLimit_SetsTruncated()
    {
        var points = Enumerable.Range(1, 5)
            .Select(i => new MapPoint
            {
                Id = Guid.NewGuid(),
                Name = $"P{i}",
                Number = $"N{i}",
                Category = "Depo",
                Longitude = 32 + i * 0.01,
                Latitude = 39.9,
                XMercator = 3_600_000,
                YMercator = 4_800_000,
            })
            .ToList();

        var repo = new Mock<IMapPointQueryRepository>();
        repo.Setup(r => r.GetAllWithinBBoxAsync(It.IsAny<MapPointBBoxDto>(), 3, It.IsAny<CancellationToken>()))
            .ReturnsAsync((points.Take(3).ToList(), 5));

        var sut = CreateSut(repo, bboxMax: 100);
        var bbox = new MapPointBBoxDto { MinLongitude = 32, MinLatitude = 39, MaxLongitude = 33, MaxLatitude = 40 };
        var access = new MapPointAccessContext
        {
            UserId = Guid.NewGuid(),
            Roles = [RoleNames.Admin],
        };

        var result = await sut.ListAsync(access, bbox, limit: 3);

        result.ReturnedCount.Should().Be(3);
        result.TotalCount.Should().Be(5);
        result.Truncated.Should().BeTrue();
        result.MaxResults.Should().Be(100);
    }

    [Fact]
    public async Task ListAsync_NonAdmin_UsesUserRepository()
    {
        var userId = Guid.NewGuid();
        var repo = new Mock<IMapPointQueryRepository>();
        repo.Setup(r => r.GetByUserLimitedAsync(userId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((new List<MapPoint>(), 0));

        var sut = CreateSut(repo);
        var access = new MapPointAccessContext
        {
            UserId = userId,
            Roles = [RoleNames.User],
        };

        await sut.ListAsync(access);

        repo.Verify(r => r.GetByUserLimitedAsync(userId, It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Once);
        repo.Verify(r => r.GetAllLimitedAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
