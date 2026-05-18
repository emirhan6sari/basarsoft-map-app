using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Exceptions;
using BasarsoftOdev.BLL.Interfaces;
using BasarsoftOdev.Domain.Entities;

namespace BasarsoftOdev.BLL.Services.MapPoints;

/// <summary>Yalnızca kendi oluşturduğu noktalar; başkasının kaydı 403.</summary>
public sealed class UserMapPointAccessPolicy : IMapPointAccessPolicy
{
    public bool IncludeCreatorInfo => false;

    public void EnsureCanRead(MapPoint entity, MapPointAccessContext context)
    {
        if (entity.CreatedByUserId != context.UserId)
            throw new ForbiddenBusinessException("Bu noktayı görüntüleme yetkiniz yok.");
    }

    public void EnsureCanModify(MapPoint entity, MapPointAccessContext context)
    {
        if (entity.CreatedByUserId != context.UserId)
            throw new ForbiddenBusinessException("Bu noktayı değiştirme yetkiniz yok.");
    }
}
