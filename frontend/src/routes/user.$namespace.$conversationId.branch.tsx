import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/user/$namespace/$conversationId/branch')({
  component: BranchRedirectComponent,
});

function BranchRedirectComponent() {
  const { namespace, conversationId } = Route.useParams();
  const navigate = useNavigate();

  // Redirect to conversation (main branch)
  useEffect(() => {
    navigate({ to: '/user/$namespace/$conversationId', params: { namespace, conversationId } });
  }, [navigate, namespace, conversationId]);

  return null;
}
