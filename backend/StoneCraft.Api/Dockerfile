# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore as distinct layers
COPY ["StoneCraft.Api.csproj", "./"]
RUN dotnet restore "StoneCraft.Api.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src"
RUN dotnet build "StoneCraft.Api.csproj" -c Release -o /app/build

# Publish the app
FROM build AS publish
RUN dotnet publish "StoneCraft.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Copy the published app
COPY --from=publish /app/publish .

# Copy the frontend files to wwwroot
COPY ../../frontend/public/ wwwroot/

# Expose the port the app runs on
EXPOSE 80
EXPOSE 443

# Set the entry point
ENTRYPOINT ["dotnet", "StoneCraft.Api.dll"]
