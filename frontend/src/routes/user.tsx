import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/user')({
  component: UserRedirectComponent,
});

function UserRedirectComponent() {
  const navigate = useNavigate();

  // Redirect to home
  useEffect(() => {
    navigate({ to: '/' });
  }, [navigate]);

  return null;
}
