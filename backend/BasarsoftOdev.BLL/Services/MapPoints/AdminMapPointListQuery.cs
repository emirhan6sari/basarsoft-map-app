using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Dtos;
using BasarsoftOdev.BLL.Interfaces;
using BasarsoftOdev.Domain.Entities;

namespace BasarsoftOdev.BLL.Services.MapPoints;

/// <summary>Admin listesi — bbox varsa filtreli, yoksa genel üst sınır.</summary>
public sealed class AdminMapPointListQuery : IMapPointListQuery
{
    private readonly IMapPointQueryRepository _queries;

    public AdminMapPointListQuery(IMapPointQueryRepository queries) => _queries = queries;

    public int Priority => 0;

    public bool CanHandle(MapPointAccessContext context) => context.IsInRole(RoleNames.Admin);

    public Task<(IReadOnlyList<MapPoint> Items, int TotalCount)> ExecuteAsync(
        MapPointAccessContext context,
        MapPointBBoxDto? bbox,
        int take,
        CancellationToken cancellationToken = default)
    {
        if (bbox is null)
            return _queries.GetAllLimitedAsync(take, cancellationToken);
        return _queries.GetAllWithinBBoxAsync(bbox, take, cancellationToken);
    }
}
