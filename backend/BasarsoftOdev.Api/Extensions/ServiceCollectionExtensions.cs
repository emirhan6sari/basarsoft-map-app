using System.Text;
using BasarsoftOdev.BLL;
using BasarsoftOdev.BLL.Options;
using BasarsoftOdev.DAL;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

namespace BasarsoftOdev.Api.Extensions;

public static class ServiceCollectionExtensions
{
    public const string FrontendCorsPolicy = "FrontendCorsPolicy";

    public static IServiceCollection AddApiServices(this IServiceCollection services, IConfiguration configuration, string connectionString)
    {
        services.AddBusinessOptions(configuration);
        services.AddBusinessLayer();
        services.AddDataAccessLayer(configuration, connectionString);

        services.AddControllers()
            .AddJsonOptions(opts =>
            {
                opts.JsonSerializerOptions.Converters.Add(
                    new System.Text.Json.Serialization.JsonStringEnumConverter());
            });

        services.AddFluentValidationAutoValidation();
        services.AddFluentValidationClientsideAdapters();

        services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                var jwt = configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>()!;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwt.Issuer,
                    ValidAudience = jwt.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SecretKey)),
                    ClockSkew = TimeSpan.FromMinutes(1),
                };
            });

        services.AddAuthorization();

        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Başarsoft Map API",
                Version = "v1",
                Description = "Katmanlı mimari (API/BLL/DAL), JWT auth, Serilog logging, PostGIS.",
            });

            c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Description = "JWT: Bearer {token}",
                Name = "Authorization",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
            });

            c.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" },
                    },
                    Array.Empty<string>()
                },
            });
        });

        services.AddCors(options =>
        {
            options.AddPolicy(FrontendCorsPolicy, policy =>
            {
                var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
                var all = new[] { "http://localhost:5173", "http://localhost:4173" }.Concat(origins).ToArray();
                policy.WithOrigins(all).AllowAnyHeader().AllowAnyMethod();
            });
        });

        return services;
    }
}
