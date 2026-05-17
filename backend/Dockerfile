# Monorepo: Api + BLL + DAL + Domain — Railway root directory = backend
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY BasarsoftOdev.Domain/BasarsoftOdev.Domain.csproj BasarsoftOdev.Domain/
COPY BasarsoftOdev.BLL/BasarsoftOdev.BLL.csproj BasarsoftOdev.BLL/
COPY BasarsoftOdev.DAL/BasarsoftOdev.DAL.csproj BasarsoftOdev.DAL/
COPY BasarsoftOdev.Api/BasarsoftOdev.Api.csproj BasarsoftOdev.Api/
RUN dotnet restore BasarsoftOdev.Api/BasarsoftOdev.Api.csproj

COPY . .
RUN dotnet publish BasarsoftOdev.Api/BasarsoftOdev.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
# Railway: ASPNETCORE_URLS=http://0.0.0.0:${PORT} (servis Variables)
ENTRYPOINT ["dotnet", "BasarsoftOdev.Api.dll"]
