"""Seed realistic demo data for Customer 10 (H. Borgmeier GmbH & Co. KG).

Idempotent: re-runs are safe. Existence-checks gate every insert, so running
this script twice does not double-seed.

Usage:
    .venv/bin/python tools/seed_borgmeier_demo.py
"""

from __future__ import annotations

import os
import struct
import sys
import zlib
from datetime import date, datetime, time, timedelta, timezone

import psycopg
from dotenv import load_dotenv

CUSTOMER_ID = 10
ASSIGNEE = "Demo Vorarbeiter"
SEED_TAG = "demo-seed"

# Stable tour_date markers so existence-checks can find prior seed runs.
TODAY = date(2026, 5, 25)
YESTERDAY = TODAY - timedelta(days=1)
LAST_MONTH = TODAY - timedelta(days=30)

# Distinct assignees to satisfy unique(customer_id, tour_date, assignee).
ASSIGNEE_ACCEPTED = "Demo Vorarbeiter"
ASSIGNEE_COMPLETED = "Demo Vorarbeiter II"
ASSIGNEE_IN_PROGRESS = "Demo Vorarbeiter III"

DEPARTMENTS_OBJECTS = [
    ("Produktion 1", "Förderband", "täglich"),
    ("Produktion 1", "Schneidemaschine", "täglich"),
    ("Produktion 1", "Bodenfläche", "täglich"),
    ("Produktion 1", "Wandfliesen", "wöchentlich"),
    ("Produktion 1", "Decke", "monatlich"),
    ("Halle 2", "Verpackungsmaschine", "täglich"),
    ("Halle 2", "Förderband", "täglich"),
    ("Halle 2", "Bodenfläche", "täglich"),
    ("Halle 2", "Wandfliesen", "wöchentlich"),
    ("Halle 2", "Hochregal", "monatlich"),
    ("Kühlraum", "Bodenfläche", "täglich"),
    ("Kühlraum", "Türgriffe", "täglich"),
    ("Kühlraum", "Regale", "wöchentlich"),
    ("Kühlraum", "Decke", "monatlich"),
    ("Sanitär Halle 1", "Toiletten", "täglich"),
    ("Sanitär Halle 1", "Waschbecken", "täglich"),
    ("Sanitär Halle 1", "Spiegel", "täglich"),
    ("Sanitär Halle 1", "Bodenfläche", "täglich"),
    ("Versand", "Bodenfläche", "täglich"),
    ("Versand", "Verladestation", "wöchentlich"),
]


def make_placeholder_jpeg() -> bytes:
    """Return a tiny but valid 1x1 JPEG placeholder.

    The portal renders photos via /api/photo/{id}; we only need a parseable
    byte stream for the bytea column, not actual visual content.
    """
    # Minimal valid baseline JPEG (1x1 pixel, neutral grey).
    return bytes.fromhex(
        "ffd8ffe000104a46494600010100000100010000"
        "ffdb0043000806060706060808070708090907080a0c140d0c0b0b0c191213"
        "0f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27"
        "393d38323c2e333432ffdb0043010909090c0b0c180d0d1832211c213232"
        "32323232323232323232323232323232323232323232323232323232323232"
        "32323232323232323232323232ffc00011080001000103012200021101031101"
        "ffc4001f0000010501010101010100000000000000000102030405060708090a0b"
        "ffc400b5100002010303020403050504040000017d010203000411051221314106"
        "13516107227114328191a1082342b1c11552d1f02433627282090a161718191a25"
        "262728292a3435363738393a434445464748494a535455565758595a6364656667"
        "68696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6"
        "a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2"
        "e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffc4001f01000301010101010101010"
        "1010000000000000102030405060708090a0bffc400b5110002010204040304070"
        "5040400010277000102031104052131061241510761711322328108144291a1b1"
        "c109233352f0156272d10a162434e125f11718191a262728292a35363738393a4"
        "34445464748494a535455565758595a636465666768696a737475767778797a8"
        "2838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6"
        "b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2"
        "f3f4f5f6f7f8f9faffda000c03010002110311003f00fbfbf28a2803ffd9"
    )


def upsert_tour(cur, *, tour_date: date, assignee: str, status: str,
                started_at, completed_at, accepted_at,
                accepted_by_name, accepted_by_role, notes) -> tuple[int, bool]:
    """Insert tour if not present; returns (id, created)."""
    cur.execute(
        "select id from ops.tour "
        "where customer_id=%s and tour_date=%s and assignee=%s",
        (CUSTOMER_ID, tour_date, assignee),
    )
    row = cur.fetchone()
    if row:
        return row[0], False

    cur.execute(
        """
        insert into ops.tour (
            customer_id, tour_date, assignee, status,
            started_at, completed_at, accepted_at,
            accepted_by_name, accepted_by_role, notes
        )
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        returning id
        """,
        (CUSTOMER_ID, tour_date, assignee, status,
         started_at, completed_at, accepted_at,
         accepted_by_name, accepted_by_role, notes),
    )
    return cur.fetchone()[0], True


def insert_task(cur, *, tour_id: int | None, sheet_id: int | None,
                department: str, obj: str, interval: str,
                scheduled_date: date, status: str,
                completed_at, completed_by, comment) -> int:
    cur.execute(
        """
        insert into ops.inspection_task (
            tour_id, cleaning_sheet_id, customer_id,
            department_name_snapshot, object_name_snapshot,
            interval_label_snapshot, responsible_party_snapshot,
            scheduled_date, status,
            completed_at, completed_by, comment
        )
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        returning id
        """,
        (tour_id, sheet_id, CUSTOMER_ID,
         department, obj, interval, "MUENSTERMANN",
         scheduled_date, status,
         completed_at, completed_by, comment),
    )
    return cur.fetchone()[0]


def tasks_already_seeded(cur, tour_id: int) -> bool:
    cur.execute(
        "select count(*) from ops.inspection_task "
        "where tour_id=%s and completed_by=%s",
        (tour_id, SEED_TAG),
    )
    return cur.fetchone()[0] > 0


def at(d: date, h: int, m: int = 0) -> datetime:
    return datetime.combine(d, time(h, m), tzinfo=timezone.utc)


def seed_accepted_tour(cur):
    """Tour from last month, ACCEPTED, 10 tasks all DONE."""
    started = at(LAST_MONTH, 6, 30)
    completed = at(LAST_MONTH, 11, 45)
    accepted = at(LAST_MONTH, 12, 15)
    tour_id, created = upsert_tour(
        cur,
        tour_date=LAST_MONTH,
        assignee=ASSIGNEE_ACCEPTED,
        status="ACCEPTED",
        started_at=started,
        completed_at=completed,
        accepted_at=accepted,
        accepted_by_name="Herr Borgmeier",
        accepted_by_role="Produktionsleiter",
        notes="Monatliche Hauptreinigung — alle Kontrollpunkte ohne Beanstandung.",
    )
    if not created and tasks_already_seeded(cur, tour_id):
        print(f"  tour ACCEPTED #{tour_id}: already seeded, skipping tasks")
        return tour_id, []

    task_ids = []
    for i, (dept, obj, interval) in enumerate(DEPARTMENTS_OBJECTS[:10]):
        completed_at_ts = at(LAST_MONTH, 7 + (i // 3), (i * 15) % 60)
        tid = insert_task(
            cur,
            tour_id=tour_id,
            sheet_id=None,
            department=dept,
            obj=obj,
            interval=interval,
            scheduled_date=LAST_MONTH,
            status="DONE",
            completed_at=completed_at_ts,
            completed_by=SEED_TAG,
            comment=None,
        )
        task_ids.append(tid)
    print(f"  tour ACCEPTED #{tour_id}: 10 DONE tasks {task_ids[0]}..{task_ids[-1]}")
    return tour_id, task_ids


def seed_completed_tour(cur):
    """Tour from yesterday, COMPLETED (awaiting acceptance), 8 tasks
    (6 DONE, 1 PROBLEM, 1 SKIPPED)."""
    started = at(YESTERDAY, 6, 0)
    completed = at(YESTERDAY, 14, 30)
    tour_id, created = upsert_tour(
        cur,
        tour_date=YESTERDAY,
        assignee=ASSIGNEE_COMPLETED,
        status="COMPLETED",
        started_at=started,
        completed_at=completed,
        accepted_at=None,
        accepted_by_name=None,
        accepted_by_role=None,
        notes="Tour abgeschlossen — wartet auf Abnahme durch den Kunden.",
    )
    if not created and tasks_already_seeded(cur, tour_id):
        print(f"  tour COMPLETED #{tour_id}: already seeded, skipping tasks")
        cur.execute(
            "select id from ops.inspection_task "
            "where tour_id=%s and status='PROBLEM'", (tour_id,))
        existing_problem = [r[0] for r in cur.fetchall()]
        return tour_id, existing_problem

    plan = [
        ("DONE", None),
        ("DONE", None),
        ("DONE", None),
        ("DONE", None),
        ("DONE", None),
        ("DONE", None),
        ("PROBLEM", "Fettrückstände am Förderband — vor nächstem Schichtbeginn nachreinigen."),
        ("SKIPPED", "Zugang blockiert (Wartung der Verpackungsmaschine)."),
    ]
    task_ids = []
    problem_ids = []
    for i, ((dept, obj, interval), (status, comment)) in enumerate(
            zip(DEPARTMENTS_OBJECTS[:8], plan)):
        if status == "DONE":
            completed_ts = at(YESTERDAY, 7 + (i // 2), (i * 17) % 60)
            tid = insert_task(
                cur,
                tour_id=tour_id, sheet_id=None,
                department=dept, obj=obj, interval=interval,
                scheduled_date=YESTERDAY,
                status="DONE",
                completed_at=completed_ts,
                completed_by=SEED_TAG,
                comment=None,
            )
        elif status == "PROBLEM":
            completed_ts = at(YESTERDAY, 12, 30)
            tid = insert_task(
                cur,
                tour_id=tour_id, sheet_id=None,
                department=dept, obj=obj, interval=interval,
                scheduled_date=YESTERDAY,
                status="PROBLEM",
                completed_at=completed_ts,
                completed_by=SEED_TAG,
                comment=comment,
            )
            problem_ids.append(tid)
        else:  # SKIPPED
            tid = insert_task(
                cur,
                tour_id=tour_id, sheet_id=None,
                department=dept, obj=obj, interval=interval,
                scheduled_date=YESTERDAY,
                status="SKIPPED",
                completed_at=None,
                completed_by=None,
                comment=comment,
            )
        task_ids.append(tid)
    print(f"  tour COMPLETED #{tour_id}: 8 tasks {task_ids[0]}..{task_ids[-1]} "
          f"(6 DONE, 1 PROBLEM, 1 SKIPPED)")
    return tour_id, problem_ids


def seed_in_progress_tour(cur):
    """Tour from today, IN_PROGRESS, 5 tasks (3 DONE, 2 PENDING)."""
    started = at(TODAY, 6, 15)
    tour_id, created = upsert_tour(
        cur,
        tour_date=TODAY,
        assignee=ASSIGNEE_IN_PROGRESS,
        status="IN_PROGRESS",
        started_at=started,
        completed_at=None,
        accepted_at=None,
        accepted_by_name=None,
        accepted_by_role=None,
        notes="Laufende Tagestour.",
    )
    if not created and tasks_already_seeded(cur, tour_id):
        print(f"  tour IN_PROGRESS #{tour_id}: already seeded, skipping tasks")
        return tour_id, []

    plan = [
        ("DONE", None),
        ("DONE", None),
        ("DONE", None),
        ("PENDING", None),
        ("PENDING", None),
    ]
    task_ids = []
    for i, ((dept, obj, interval), (status, comment)) in enumerate(
            zip(DEPARTMENTS_OBJECTS[:5], plan)):
        if status == "DONE":
            completed_ts = at(TODAY, 7 + i, 10)
            tid = insert_task(
                cur,
                tour_id=tour_id, sheet_id=None,
                department=dept, obj=obj, interval=interval,
                scheduled_date=TODAY,
                status="DONE",
                completed_at=completed_ts,
                completed_by=SEED_TAG,
                comment=None,
            )
        else:
            tid = insert_task(
                cur,
                tour_id=tour_id, sheet_id=None,
                department=dept, obj=obj, interval=interval,
                scheduled_date=TODAY,
                status="PENDING",
                completed_at=None,
                completed_by=None,
                comment=None,
            )
        task_ids.append(tid)
    print(f"  tour IN_PROGRESS #{tour_id}: 5 tasks {task_ids[0]}..{task_ids[-1]} "
          f"(3 DONE, 2 PENDING)")
    return tour_id, []


def seed_complaint(cur, problem_task_ids: list[int]):
    """Insert one complaint against the first PROBLEM task, if not present."""
    if not problem_task_ids:
        print("  no PROBLEM task available, skipping complaint")
        return
    task_id = problem_task_ids[0]
    cur.execute(
        "select id from ops.complaint where inspection_task_id=%s "
        "and customer_id=%s", (task_id, CUSTOMER_ID))
    if cur.fetchone():
        print(f"  complaint for task #{task_id}: already exists")
        return
    cur.execute(
        """
        insert into ops.complaint (
            inspection_task_id, customer_id, description, status, resolution_due
        )
        values (%s, %s, %s, %s, %s)
        returning id
        """,
        (task_id, CUSTOMER_ID,
         "Fettrückstände am Förderband im Bereich Produktion 1 wurden trotz "
         "Reinigung nicht vollständig entfernt. Bitte vor dem nächsten "
         "Schichtbeginn nacharbeiten und Reinigungsmittel überprüfen.",
         "OPEN",
         TODAY + timedelta(days=3)),
    )
    cid = cur.fetchone()[0]
    print(f"  complaint #{cid} (OPEN) angelegt für task #{task_id}")


def seed_cleaning_sheet(cur):
    """Create 1 monthly sheet with 20 tasks."""
    period_from = TODAY.replace(day=1)
    # last day of current month
    if period_from.month == 12:
        next_month = period_from.replace(year=period_from.year + 1, month=1)
    else:
        next_month = period_from.replace(month=period_from.month + 1)
    period_to = next_month - timedelta(days=1)

    title = f"Monatsplan {period_from:%B %Y}"

    cur.execute(
        "select id from ops.cleaning_sheet "
        "where customer_id=%s and period_from=%s and period_to=%s and title=%s",
        (CUSTOMER_ID, period_from, period_to, title),
    )
    row = cur.fetchone()
    if row:
        sheet_id = row[0]
        cur.execute(
            "select count(*) from ops.inspection_task where cleaning_sheet_id=%s",
            (sheet_id,))
        if cur.fetchone()[0] >= 20:
            print(f"  cleaning_sheet #{sheet_id}: already seeded ({title})")
            return sheet_id
        print(f"  cleaning_sheet #{sheet_id}: exists but lacks tasks — topping up")
    else:
        cur.execute(
            """
            insert into ops.cleaning_sheet (
                customer_id, period_from, period_to,
                assignee, title, status
            )
            values (%s, %s, %s, %s, %s, %s)
            returning id
            """,
            (CUSTOMER_ID, period_from, period_to,
             ASSIGNEE, title, "ACTIVE"),
        )
        sheet_id = cur.fetchone()[0]
        print(f"  cleaning_sheet #{sheet_id} ({title}) angelegt")

    # Status-Mix für 20 Tasks
    plan_status = (
        ["DONE"] * 12 +
        ["PENDING"] * 5 +
        ["PROBLEM"] * 2 +
        ["SKIPPED"] * 1
    )
    task_ids = []
    for i in range(20):
        dept, obj, interval = DEPARTMENTS_OBJECTS[i]
        status = plan_status[i]
        sched = period_from + timedelta(days=i)
        if status == "DONE":
            tid = insert_task(
                cur,
                tour_id=None, sheet_id=sheet_id,
                department=dept, obj=obj, interval=interval,
                scheduled_date=sched, status="DONE",
                completed_at=at(sched, 8, 30),
                completed_by=SEED_TAG, comment=None,
            )
        elif status == "PROBLEM":
            tid = insert_task(
                cur,
                tour_id=None, sheet_id=sheet_id,
                department=dept, obj=obj, interval=interval,
                scheduled_date=sched, status="PROBLEM",
                completed_at=at(sched, 9, 15),
                completed_by=SEED_TAG,
                comment="Defekte Wandfliese gemeldet — Reparatur eingeplant.",
            )
        elif status == "SKIPPED":
            tid = insert_task(
                cur,
                tour_id=None, sheet_id=sheet_id,
                department=dept, obj=obj, interval=interval,
                scheduled_date=sched, status="SKIPPED",
                completed_at=None, completed_by=None,
                comment="Bereich wegen Lieferanlieferung gesperrt.",
            )
        else:  # PENDING
            tid = insert_task(
                cur,
                tour_id=None, sheet_id=sheet_id,
                department=dept, obj=obj, interval=interval,
                scheduled_date=sched, status="PENDING",
                completed_at=None, completed_by=None, comment=None,
            )
        task_ids.append(tid)
    print(f"  sheet tasks: 20 inserted ({task_ids[0]}..{task_ids[-1]})")
    return sheet_id


def seed_photos(cur, problem_task_ids: list[int]):
    """Attach 1-2 placeholder JPEGs to the first PROBLEM task."""
    if not problem_task_ids:
        print("  no PROBLEM task available, skipping photos")
        return
    task_id = problem_task_ids[0]
    cur.execute(
        "select count(*) from ops.inspection_photo "
        "where inspection_task_id=%s and uploaded_by=%s",
        (task_id, SEED_TAG),
    )
    if cur.fetchone()[0] > 0:
        print(f"  photos for task #{task_id}: already seeded")
        return

    jpeg = make_placeholder_jpeg()
    for i, caption in enumerate([
        "Beweisfoto — Förderband, Bereich Produktion 1",
        "Detailaufnahme — Fettrückstände am Antriebsrad",
    ]):
        cur.execute(
            """
            insert into ops.inspection_photo (
                inspection_task_id, uploaded_by, mime_type,
                file_size_bytes, photo_data, caption
            )
            values (%s, %s, %s, %s, %s, %s)
            returning id
            """,
            (task_id, SEED_TAG, "image/jpeg",
             len(jpeg), jpeg, caption),
        )
        pid = cur.fetchone()[0]
        print(f"  photo #{pid} angehängt an task #{task_id}: {caption!r}")


def verify(cur):
    print("\n=== Verifikation ===")
    cur.execute(
        "select status, count(*) from ops.tour where customer_id=%s "
        "group by status order by status",
        (CUSTOMER_ID,))
    print("Touren:", cur.fetchall())

    cur.execute(
        "select status, count(*) from ops.inspection_task where customer_id=%s "
        "group by status order by status",
        (CUSTOMER_ID,))
    print("Tasks: ", cur.fetchall())

    cur.execute(
        "select count(*) from ops.cleaning_sheet where customer_id=%s",
        (CUSTOMER_ID,))
    print("Sheets:", cur.fetchone()[0])

    cur.execute(
        "select count(*) from ops.complaint where customer_id=%s",
        (CUSTOMER_ID,))
    print("Complaints:", cur.fetchone()[0])

    cur.execute(
        """
        select count(*) from ops.inspection_photo p
        join ops.inspection_task t on t.id = p.inspection_task_id
        where t.customer_id=%s
        """,
        (CUSTOMER_ID,))
    print("Photos:", cur.fetchone()[0])


def main():
    load_dotenv()
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("DATABASE_URL not set", file=sys.stderr)
        sys.exit(2)

    with psycopg.connect(url) as conn:
        with conn.cursor() as cur:
            # Audit-Trail tag (SET SESSION doesn't accept bind parameters)
            cur.execute(f"set session app.user_id = '{SEED_TAG}'")

            print(f"Seeding demo data for customer #{CUSTOMER_ID} "
                  f"(H. Borgmeier GmbH & Co. KG)...")

            print("\n[1/4] Touren")
            _accepted_id, _accepted_tasks = seed_accepted_tour(cur)
            _completed_id, completed_problem_ids = seed_completed_tour(cur)
            _ip_id, _ip_tasks = seed_in_progress_tour(cur)

            print("\n[2/4] Complaint")
            seed_complaint(cur, completed_problem_ids)

            print("\n[3/4] Cleaning-Sheet")
            seed_cleaning_sheet(cur)

            print("\n[4/4] Photos")
            seed_photos(cur, completed_problem_ids)

            verify(cur)

        conn.commit()
        print("\nCOMMIT ok.")


if __name__ == "__main__":
    main()
