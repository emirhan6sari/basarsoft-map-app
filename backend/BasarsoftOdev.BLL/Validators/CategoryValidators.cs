using BasarsoftOdev.BLL.Dtos;
using FluentValidation;

namespace BasarsoftOdev.BLL.Validators;

public class CategoryCreateDtoValidator : AbstractValidator<CategoryCreateDto>
{
    public CategoryCreateDtoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Kategori adı zorunludur.")
            .MaximumLength(64);
        RuleFor(x => x.DisplayName).MaximumLength(128);
        // Sıra benzersizliği CategoryService + DB unique index ile doğrulanır
        RuleFor(x => x.SortOrder)
            .GreaterThanOrEqualTo(1).WithMessage("Sıra numarası en az 1 olmalıdır.");
    }
}

public class CategoryUpdateDtoValidator : AbstractValidator<CategoryUpdateDto>
{
    public CategoryUpdateDtoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Kategori adı zorunludur.")
            .MaximumLength(64);
        RuleFor(x => x.DisplayName).MaximumLength(128);
        RuleFor(x => x.SortOrder)
            .GreaterThanOrEqualTo(1).WithMessage("Sıra numarası en az 1 olmalıdır.");
    }
}
