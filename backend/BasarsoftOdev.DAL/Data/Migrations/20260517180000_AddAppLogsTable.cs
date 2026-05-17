using BasarsoftOdev.DAL.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BasarsoftOdev.DAL.Data.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260517180000_AddAppLogsTable")]
public partial class AddAppLogsTable : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS app_logs (
                timestamp timestamptz NOT NULL,
                level character varying(50) NOT NULL,
                message text NULL,
                message_template text NULL,
                exception text NULL,
                trace_id character varying(256) NULL,
                user_id character varying(256) NULL,
                user_name character varying(256) NULL,
                source_context character varying(500) NULL,
                properties jsonb NULL
            );

            CREATE INDEX IF NOT EXISTS "IX_app_logs_timestamp" ON app_logs (timestamp DESC);
            CREATE INDEX IF NOT EXISTS "IX_app_logs_trace_id" ON app_logs (trace_id)
                WHERE trace_id IS NOT NULL;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("DROP TABLE IF EXISTS app_logs;");
    }
}
