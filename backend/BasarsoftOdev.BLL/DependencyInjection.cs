using BasarsoftOdev.BLL.Interfaces;
using BasarsoftOdev.BLL.Options;
using BasarsoftOdev.BLL.Services;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace BasarsoftOdev.BLL;

public static class DependencyInjection
{
    public static IServiceCollection AddBusinessLayer(this IServiceCollection services)
    {
        services.AddValidatorsFromAssemblyContaining<Validators.MapPointCreateDtoValidator>();

        services.AddScoped<ICoordinateTransformationService, CoordinateTransformationService>();
        services.AddScoped<IMapPointService, MapPointService>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IAuthService, AuthService>();

        return services;
    }

    public static IServiceCollection AddBusinessOptions(this IServiceCollection services, Microsoft.Extensions.Configuration.IConfiguration configuration)
    {
        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));
        services.Configure<MapSettings>(configuration.GetSection(MapSettings.SectionName));
        return services;
    }
}
