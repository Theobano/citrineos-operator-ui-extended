// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import type { ChargingStationDto, ConnectorDto } from '@citrineos/base';
import { MenuSection } from '@lib/client/components/main-menu/main.menu';
import { Badge } from '@lib/client/components/ui/badge';
import { Button } from '@lib/client/components/ui/button';
import { StartTransactionButton } from '@lib/client/pages/charging-stations/start.transaction.button';
import { StopTransactionButton } from '@lib/client/pages/charging-stations/stop.transaction.button';
import { clickableLinkStyle } from '@lib/client/styles/page';
import Link from 'next/link';
import React from 'react';

interface ConnectorsTableProps {
  connectors: ConnectorDto[];
  onEdit: (connector: ConnectorDto) => void;
  onAdd: () => void;
  /** When provided, each connector gets independent Start/Stop actions. */
  station?: ChargingStationDto;
  evse?: { id: number; evseTypeId: number };
}

type ActiveTransaction = {
  transactionId: string;
  evseId?: number | null;
  connectorId?: number | null;
};

/** Finds the active transaction occupying this specific connector, if any. */
const findActiveTransaction = (
  station: ChargingStationDto | undefined,
  connector: ConnectorDto,
  evse?: { id: number },
): ActiveTransaction | undefined => {
  const transactions = ((station as any)?.transactions ??
    []) as ActiveTransaction[];
  return transactions.find((tx) =>
    tx.connectorId != null
      ? tx.connectorId === connector.connectorId &&
        (tx.evseId == null || !evse || tx.evseId === evse.id)
      : tx.evseId != null && !!evse && tx.evseId === evse.id,
  );
};

export const ConnectorsTable: React.FC<ConnectorsTableProps> = ({
  connectors,
  onEdit,
  station,
  evse,
}) => {
  const formatPower = (value: number | undefined) =>
    value
      ? value > 10000
        ? `${(value / 1000).toFixed(1)} kW`
        : `${value} W`
      : '-';

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Connector ID</th>
            <th className="px-4 py-2 text-left font-medium">
              EVSE Type Connector ID
            </th>
            <th className="px-4 py-2 text-left font-medium">Type</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
            <th className="px-4 py-2 text-left font-medium">Max Power</th>
            <th className="px-4 py-2 text-left font-medium">Tariff</th>
            <th className="px-4 py-2 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {connectors.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-8 text-center text-muted-foreground"
              >
                No connectors
              </td>
            </tr>
          ) : (
            connectors.map((connector) => {
              const tariffId = (connector as any).tariffId;
              const activeTx = findActiveTransaction(station, connector, evse);
              return (
                <tr key={connector.id} className="border-t hover:bg-muted/50">
                  <td className="px-4 py-2">{connector.connectorId}</td>
                  <td className="px-4 py-2">{connector.evseTypeConnectorId}</td>
                  <td className="px-4 py-2">{connector.type}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {connector.status}
                      {activeTx && <Badge>Charging</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {formatPower(connector.maximumPowerWatts || undefined)}
                  </td>
                  <td className="px-4 py-2">
                    {tariffId ? (
                      <Link
                        href={`/${MenuSection.TARIFFS}/${tariffId}`}
                        className={clickableLinkStyle}
                      >
                        #{tariffId}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-2">
                      {station?.isOnline &&
                        (activeTx ? (
                          <StopTransactionButton
                            station={station}
                            size="sm"
                            transactionId={activeTx.transactionId}
                            label="Stop"
                          />
                        ) : (
                          <StartTransactionButton
                            station={station}
                            size="sm"
                            connectorId={connector.connectorId}
                            evse={
                              evse
                                ? { id: evse.id, evseTypeId: evse.evseTypeId }
                                : undefined
                            }
                            label="Start"
                          />
                        ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(connector)}
                      >
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
