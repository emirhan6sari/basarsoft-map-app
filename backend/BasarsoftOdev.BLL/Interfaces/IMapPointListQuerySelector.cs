using BasarsoftOdev.BLL.Common;

namespace BasarsoftOdev.BLL.Interfaces;

public interface IMapPointListQuerySelector
{
    IMapPointListQuery Select(MapPointAccessContext context);
}
