using BasarsoftOdev.DAL.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BasarsoftOdev.DAL.Data.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260517200000_AddCategorySortOrderUniqueIndex")]
public partial class AddCategorySortOrderUniqueIndex : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Mevcut çakışan sıraları 1..n yap, ardından benzersiz indeks
        migrationBuilder.Sql("""
            WITH ordered AS (
                SELECT "Id", ROW_NUMBER() OVER (ORDER BY "SortOrder", "Id") AS new_order
                FROM categories
            )
            UPDATE categories c
            SET "SortOrder" = o.new_order
            FROM ordered o
            WHERE c."Id" = o."Id";

            CREATE UNIQUE INDEX IF NOT EXISTS "IX_categories_SortOrder"
            ON categories ("SortOrder");
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_categories_SortOrder\";");
    }
}
