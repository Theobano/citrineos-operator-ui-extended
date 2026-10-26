// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import { CanAccess, useTranslate } from '@refinedev/core';
import { ActionType, CommandType, ResourceType } from '@lib/utils/access.types';
import { Button } from '@lib/client/components/ui/button';
import type { ChargingStationDto } from '@citrineos/base';
import { useDispatch } from 'react-redux';
import { openModal } from '@lib/utils/store/modal.slice';
import { ModalComponentType } from '@lib/client/components/modals/modal.types';
import { instanceToPlain } from 'class-transformer';

/**
 * Intended to trigger the "Start Transaction" modal; used by charging stations views.
 */
export const StartTransactionButton = ({
  station,
  disabled = false,
  connectorId,
  evse,
  size,
  variant,
  label,
}: {
  station: ChargingStationDto;
  disabled?: boolean;
  connectorId?: number;
  evse?: { id: number; evseTypeId: number };
  size?: React.ComponentProps<typeof Button>['size'];
  variant?: React.ComponentProps<typeof Button>['variant'];
  label?: string;
}) => {
  const dispatch = useDispatch();
  const translate = useTranslate();

  return (
    <CanAccess
      resource={ResourceType.CHARGING_STATIONS}
      action={ActionType.COMMAND}
      params={{
        id: station.id,
        commandType: CommandType.START_TRANSACTION,
      }}
    >
      <Button
        disabled={disabled}
        size={size}
        variant={variant}
        onClick={() => {
          dispatch(
            openModal({
              title: translate('ChargingStations.remoteStart'),
              modalComponentType: ModalComponentType.remoteStart,
              modalComponentProps: {
                station: instanceToPlain(station),
                connectorId,
                evse,
              },
            }),
          );
        }}
      >
        {label ?? translate('ChargingStations.startTransaction')}
      </Button>
    </CanAccess>
  );
};
