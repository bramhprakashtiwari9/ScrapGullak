import { Link } from 'react-router-dom';
import { Recycle } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';

export default function NotFound() {
  return (
    <div className="container-page py-20">
      <EmptyState icon={Recycle} title="This page went out with the scrap" action={<Link to="/" className="btn-primary">Go to the home page</Link>}>
        The link may be old or mistyped.
      </EmptyState>
    </div>
  );
}
