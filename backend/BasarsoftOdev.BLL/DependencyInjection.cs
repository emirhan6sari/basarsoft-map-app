using BasarsoftOdev.BLL.Interfaces;
using BasarsoftOdev.BLL.Options;
using BasarsoftOdev.BLL.Services;
using BasarsoftOdev.BLL.Services.MapPoints;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace BasarsoftOdev.BLL;

public static class DependencyInjection
{
    public static IServiceCollection AddBusinessLayer(this IServiceCollection services)
    {
        services.AddValidatorsFromAssemblyContaining<Validators.MapPointCreateDtoValidator>();

        services.AddScoped<ICoordinateTransformationService, CoordinateTransformationService>();
        services.AddScoped<IGeoGeometryParser, GeoGeometryParser>();
        services.AddScoped<IMapPointService, MapPointService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IAuthService, AuthService>();

        AddMapPointAccessPolicies(services);

        return services;
    }

    /// <summary>MapPoint rol politikaları ve liste sorguları (OCP).</summary>
    private static void AddMapPointAccessPolicies(IServiceCollection services)
    {
        services.AddScoped<AdminMapPointAccessPolicy>();
        services.AddScoped<UserMapPointAccessPolicy>();
        services.AddScoped<IMapPointAccessPolicyResolver, MapPointAccessPolicyResolver>();

        services.AddScoped<IMapPointListQuery, AdminMapPointListQuery>();
        services.AddScoped<IMapPointListQuery, UserMapPointListQuery>();
        services.AddScoped<IMapPointListQuerySelector, MapPointListQuerySelector>();
    }

    public static IServiceCollection AddBusinessOptions(this IServiceCollection services, Microsoft.Extensions.Configuration.IConfiguration configuration)
    {
        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));
        services.Configure<MapSettings>(configuration.GetSection(MapSettings.SectionName));
        return services;
    }
}
