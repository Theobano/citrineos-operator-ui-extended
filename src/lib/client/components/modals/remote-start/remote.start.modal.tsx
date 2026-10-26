// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { ChargingStationDto } from '@citrineos/base';
import { OCPPVersion } from '@citrineos/base';
import { ChargingStationClass } from '@lib/cls/charging.station.dto';
import { plainToInstance } from 'class-transformer';
import { useMemo } from 'react';
import { OCPP1_6_RemoteStart } from './1.6';
import { OCPP2_0_1_RemoteStart } from './2.0.1';

export interface RemoteStartTransactionModalProps {
  station: any;
  /** Preselect a connector (OCPP 1.6) so several connectors can be started independently. */
  connectorId?: number;
  /** Preselect an EVSE (OCPP 2.x) as { id, evseTypeId }. */
  evse?: { id: number; evseTypeId: number };
}

export const RemoteStartTransactionModal = ({
  station,
  connectorId,
  evse,
}: RemoteStartTransactionModalProps) => {
  const parsedStation: ChargingStationDto = useMemo(
    () => plainToInstance(ChargingStationClass, station),
    [station],
  ) as ChargingStationDto;

  // Dynamically render the appropriate component based on protocol version
  const renderCommandsByProtocol = () => {
    switch (parsedStation.protocol) {
      case OCPPVersion.OCPP1_6:
        return (
          <OCPP1_6_RemoteStart
            station={parsedStation}
            initialConnectorId={connectorId}
          />
        );
      case OCPPVersion.OCPP2_0_1:
      case OCPPVersion.OCPP2_1:
        return (
          <OCPP2_0_1_RemoteStart station={parsedStation} initialEvse={evse} />
        );
      default:
        return (
          <div>Unsupported protocol version: {parsedStation.protocol}</div>
        );
    }
  };

  return <div>{renderCommandsByProtocol()}</div>;
};
