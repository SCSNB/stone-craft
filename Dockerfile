FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["backend/StoneCraft.Api/StoneCraft.Api.csproj", "backend/StoneCraft.Api/"]
RUN dotnet restore "backend/StoneCraft.Api/StoneCraft.Api.csproj"

COPY . .
WORKDIR "/src/backend/StoneCraft.Api"
RUN dotnet build "StoneCraft.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "StoneCraft.Api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app

# Copy the published app
COPY --from=publish /app/publish .
# Copy the frontend files to wwwroot
COPY frontend/public /app/wwwroot

# Configure the app to listen on port 80
ENV ASPNETCORE_URLS=http://+:80

ENTRYPOINT ["dotnet", "StoneCraft.Api.dll"]
