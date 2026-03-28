import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import dbSchema from '@/db-schema.json';
import { SchemaTableForm } from '@/components/dynamic-db/schema-table-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authOptions } from '@/src/auth';
import { getAdminAuthorization } from '@/src/domain/authorization/use-cases';
import { parseDbSchemaDocument } from '@/src/dynamic-db/schema';

type DataStudioPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DataStudioPage({ params }: DataStudioPageProps) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);
  const authorization = getAdminAuthorization(session);

  if (!authorization.ok) {
    redirect(`/${locale}`);
  }

  const parsedSchema = parseDbSchemaDocument(dbSchema);

  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader>
        <CardTitle>Schema-driven data studio</CardTitle>
        <CardDescription>
          Forms below are generated from <code>db-schema.json</code>. Submit a form to insert a record in the mapped DB table.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {parsedSchema.tables.map((table) => (
          <SchemaTableForm key={table.name} table={table} />
        ))}
      </CardContent>
    </Card>
  );
}
