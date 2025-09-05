import json
from django.core.management.base import BaseCommand
from django.db import connection


def run_sql(cur, sql):
    try:
        cur.execute(sql)
        cols = [d[0] for d in cur.description] if cur.description else []
        rows = cur.fetchall() if cur.description else []
        return {"ok": True, "columns": cols, "rows": rows}
    except Exception as e:
        return {"ok": False, "error": str(e)}


class Command(BaseCommand):
    help = "Prints PostgreSQL diagnostics (connections, waits, locks, vacuum stats)"

    def handle(self, *args, **options):
        report = {}
        with connection.cursor() as cur:
            # Basic info
            report["now"] = run_sql(cur, "select now();")
            report["server_version"] = run_sql(cur, "show server_version;")
            report["max_connections"] = run_sql(cur, "show max_connections;")

            # Connection counts
            report["connections_total"] = run_sql(
                cur, "select count(*) as total from pg_stat_activity;"
            )
            report["connections_by_state"] = run_sql(
                cur,
                """
                select coalesce(state,'unknown') as state, count(*)
                from pg_stat_activity
                group by 1 order by 2 desc;
                """,
            )

            # Long running and waiting queries (top 20)
            report["top_activity"] = run_sql(
                cur,
                """
                select pid, usename, state, wait_event_type, wait_event,
                       now() - query_start as elapsed, left(query, 500) as query
                from pg_stat_activity
                where datname = current_database()
                order by elapsed desc nulls last
                limit 20;
                """,
            )

            # Locks not granted
            report["locks_waiting"] = run_sql(
                cur,
                """
                select a.pid, a.usename, a.state, l.locktype, l.mode, l.granted,
                       left(a.query, 300) as query
                from pg_locks l
                join pg_stat_activity a on a.pid = l.pid
                where not l.granted
                order by a.query_start asc nulls last
                limit 50;
                """,
            )

            # Autovacuum / dead tuples
            report["dead_tuples"] = run_sql(
                cur,
                """
                select relname, n_live_tup, n_dead_tup,
                       last_vacuum, last_autovacuum
                from pg_stat_user_tables
                order by n_dead_tup desc nulls last
                limit 20;
                """,
            )

            # BGWriter stats (checkpoint pressure)
            report["bgwriter"] = run_sql(cur, "select * from pg_stat_bgwriter;")

        self.stdout.write(json.dumps(report, indent=2, default=str))

