using BasarsoftOdev.BLL.Common;

namespace BasarsoftOdev.BLL.Interfaces;

public interface IMapPointAccessPolicyResolver
{
    IMapPointAccessPolicy Resolve(MapPointAccessContext context);
}
