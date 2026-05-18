namespace BasarsoftOdev.BLL.Interfaces;

/// <summary>Kategori repository birleşimi — DAL kaydı için.</summary>
public interface ICategoryRepository
    : ICategoryQueryRepository, ICategoryCommandRepository, IMapPointCategoryLinkRepository
{
}
