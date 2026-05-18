using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Exceptions;
using BasarsoftOdev.BLL.Interfaces;

namespace BasarsoftOdev.BLL.Services.MapPoints;

/// <summary>Liste sorgusu — rol başına bir <see cref="IMapPointListQuery"/> implementasyonu.</summary>
public sealed class MapPointListQuerySelector : IMapPointListQuerySelector
{
    private readonly IReadOnlyList<IMapPointListQuery> _queries;

    public MapPointListQuerySelector(IEnumerable<IMapPointListQuery> queries)
    {
        _queries = queries.OrderBy(q => q.Priority).ToList();
    }

    public IMapPointListQuery Select(MapPointAccessContext context)
    {
        var match = _queries.FirstOrDefault(q => q.CanHandle(context));
        if (match is null)
            throw new ForbiddenBusinessException("Bu işlem için uygun rol bulunamadı.");
        return match;
    }
}
