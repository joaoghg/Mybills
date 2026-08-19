# Operational recovery

If Open Finance ingestion must be rolled back:

1. Set `OPEN_FINANCE_ENABLED=false` so HTTP routes, the worker, and the stale scheduler stop.
2. Restore the pre-cutover database backup. Do not run the financial-data cutover script as a recovery step.
3. Leave remote Connector 200 Items and Meu Pluggy bank consents untouched unless a user explicitly disconnects a connection.
4. Do not call Pluggy `DELETE /items` automatically during restore.

Manual disconnect remains the only supported way to delete a proxy Item.
