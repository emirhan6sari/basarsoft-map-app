using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Dtos;
using BasarsoftOdev.BLL.Interfaces;
using BasarsoftOdev.Domain.Entities;

namespace BasarsoftOdev.BLL.Services.MapPoints;

/// <summary>User listesi — yalnızca CreatedByUserId eşleşen kayıtlar.</summary>
public sealed class UserMapPointListQuery : IMapPointListQuery
{
    private readonly IMapPointQueryRepository _queries;

    public UserMapPointListQuery(IMapPointQueryRepository queries) => _queries = queries;

    public int Priority => 10;

    public bool CanHandle(MapPointAccessContext context) => context.IsInRole(RoleNames.User);

    public Task<(IReadOnlyList<MapPoint> Items, int TotalCount)> ExecuteAsync(
        MapPointAccessContext context,
        MapPointBBoxDto? bbox,
        int take,
        CancellationToken cancellationToken = default)
    {
        if (bbox is null)
            return _queries.GetByUserLimitedAsync(context.UserId, take, cancellationToken);
        return _queries.GetByUserWithinBBoxAsync(context.UserId, bbox, take, cancellationToken);
    }
}
