import * as Sentry from '@sentry/node';

export const initSentry = () => {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.log('ℹ️ Sentry DSN not configured. Error monitoring disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Don't send errors in development unless explicitly configured
    enabled: !!dsn,
    beforeSend(event) {
      // Strip sensitive data
      if (event.request?.data) {
        const sensitiveFields = ['password', 'ssn', 'currentPassword', 'newPassword'];
        for (const field of sensitiveFields) {
          if (event.request.data[field]) {
            event.request.data[field] = '[REDACTED]';
          }
        }
      }
      return event;
    }
  });

  console.log('✅ Sentry error monitoring initialized');
};

export { Sentry };
