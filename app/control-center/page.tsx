import { isAuthenticated } from '@/lib/adminAuth';
import { getSiteConfigFresh, DEFAULT_CONFIG } from '@/lib/site-config';
import { ControlCenter } from '@/components/ControlCenter';
import { ControlCenterLogin } from '@/components/ControlCenterLogin';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Control Center — DueNever',
  robots: { index: false, follow: false },
};

export default async function ControlCenterPage() {
  if (!(await isAuthenticated())) {
    return <ControlCenterLogin />;
  }
  const config = await getSiteConfigFresh();
  return <ControlCenter initialConfig={config ?? DEFAULT_CONFIG} offline={!config} />;
}
