-- Errors that mean nothing went wrong (a screen-change animation cancelled
-- because the app went to the background, and friends) are no longer logged
-- (lib/server/error-log.ts). Clear the ones already there.
delete from public.error_log
 where message ~* '^(Transition was (aborted|skipped)|ResizeObserver loop|AbortError: The operation was aborted)'
    or message ~* 'The play\(\) request was interrupted by a call to pause\(\)';
