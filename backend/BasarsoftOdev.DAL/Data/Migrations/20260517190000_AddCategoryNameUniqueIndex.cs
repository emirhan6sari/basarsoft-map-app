using BasarsoftOdev.DAL.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BasarsoftOdev.DAL.Data.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260517190000_AddCategoryNameUniqueIndex")]
public partial class AddCategoryNameUniqueIndex : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_categories_Name"
            ON categories ("Name");
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_categories_Name\";");
    }
}
