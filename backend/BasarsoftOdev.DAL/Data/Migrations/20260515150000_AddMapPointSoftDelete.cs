using System;
using BasarsoftOdev.DAL.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BasarsoftOdev.DAL.Data.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260515150000_AddMapPointSoftDelete")]
public partial class AddMapPointSoftDelete : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "IsDeleted",
            table: "map_points",
            type: "boolean",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<DateTime>(
            name: "DeletedAt",
            table: "map_points",
            type: "timestamptz",
            nullable: true);

        migrationBuilder.AddColumn<Guid>(
            name: "DeletedByUserId",
            table: "map_points",
            type: "uuid",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_map_points_IsDeleted",
            table: "map_points",
            column: "IsDeleted");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_map_points_IsDeleted",
            table: "map_points");

        migrationBuilder.DropColumn(name: "DeletedByUserId", table: "map_points");
        migrationBuilder.DropColumn(name: "DeletedAt", table: "map_points");
        migrationBuilder.DropColumn(name: "IsDeleted", table: "map_points");
    }
}
