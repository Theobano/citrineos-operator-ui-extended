// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import { authClient } from '@lib/auth/auth-client';
import { parseOrganizationMetadata } from '@lib/auth/organization-metadata';
import { Badge } from '@lib/client/components/ui/badge';
import { Button } from '@lib/client/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@lib/client/components/ui/dialog';
import { Input } from '@lib/client/components/ui/input';
import { Label } from '@lib/client/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@lib/client/components/ui/table';
import { heading2Style, pageFlex, pageMargin } from '@lib/client/styles/page';
import config from '@lib/utils/config';
import { getNextTenantIdAction } from '@lib/server/actions/tenants';
import { Loader2, Plus } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const AdminOrganizationsPage: React.FC = () => {
  const { data: organizations, isPending } = authClient.useListOrganizations();
  const { data: active } = authClient.useActiveOrganization();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    tenantId: String(config.tenantId),
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      metadata: { tenantId: form.tenantId },
    };
    const res = editId
      ? await authClient.organization.update({
          organizationId: editId,
          data: payload,
        })
      : await authClient.organization.create({
          ...payload,
          slug: slugify(form.name),
        });
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message || 'Could not create organization');
      return;
    }
    toast.success(editId ? 'Organization updated' : 'Organization created');
    setOpen(false);
    setEditId(null);
    setForm({ name: '', tenantId: String(config.tenantId) });
  };

  const activate = async (organizationId: string) => {
    const res = await authClient.organization.setActive({ organizationId });
    if (res.error) {
      toast.error(res.error.message || 'Could not switch organization');
      return;
    }
    window.location.reload();
  };

  const remove = async (organizationId: string, name: string) => {
    if (!confirm(`Delete organization "${name}"?`)) return;
    const res = await authClient.organization.delete({ organizationId });
    if (res.error) {
      toast.error(res.error.message || 'Could not delete organization');
      return;
    }
    toast.success('Organization deleted');
  };

  return (
    <div className={`${pageMargin} ${pageFlex}`}>
      <div className="flex items-center justify-between">
        <h2 className={heading2Style}>Organizations</h2>
        <Button
          onClick={async () => {
            setEditId(null);
            setForm({ name: '', tenantId: String(config.tenantId) });
            setOpen(true);
            const res = await getNextTenantIdAction();
            if (res.success) {
              setForm((f) => ({ ...f, tenantId: String(res.data) }));
            }
          }}
        >
          <Plus /> New organization
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Each organization maps to a CitrineOS tenant. Members of an organization
        only see that tenant&apos;s data.
      </p>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Tenant ID</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  <Loader2 className="mx-auto animate-spin" />
                </TableCell>
              </TableRow>
            )}
            {(organizations ?? []).map((org) => {
              const metadata = parseOrganizationMetadata(org.metadata);
              return (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">
                    {org.name} {active?.id === org.id && <Badge>Active</Badge>}
                  </TableCell>
                  <TableCell>{org.slug}</TableCell>
                  <TableCell>{metadata.tenantId ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {active?.id !== org.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => activate(org.id)}
                        >
                          Switch
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditId(org.id);
                          setForm({
                            name: org.name,
                            tenantId: String(
                              metadata.tenantId ?? config.tenantId,
                            ),
                          });
                          setOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => remove(org.id, org.name)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit' : 'Create'} organization</DialogTitle>
          </DialogHeader>
          <form onSubmit={create} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Name</Label>
              <Input
                id="org-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-tenant">CitrineOS tenant ID</Label>
              <Input
                id="org-tenant"
                type="number"
                required
                value={form.tenantId}
                onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                {editId ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
