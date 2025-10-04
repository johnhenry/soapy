import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/')({
  component: IndexComponent,
});

function IndexComponent() {
  const navigate = useNavigate();

  // Redirect to default namespace
  useEffect(() => {
    navigate({ to: '/$namespace', params: { namespace: 'default' } });
  }, [navigate]);

  return null;
}
