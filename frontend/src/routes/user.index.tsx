import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/user/')({
  beforeLoad: async () => {
    throw redirect({ to: '/' });
  },
});
