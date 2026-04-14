import { Injectable } from '@nestjs/common';
import { Vehicle } from 'prisma/generated/client';
import { DvlaService } from 'src/common/lib/DVLA/DvlaService';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class VehicleRepository {
  constructor(private readonly prisma: PrismaService) {}

  shouldRefreshMotData(motLastCheckedAt: Date | null) {
    if (!motLastCheckedAt) return true;
    return (
      new Date().getTime() - new Date(motLastCheckedAt).getTime() >
      24 * 60 * 60 * 1000
    );
  }

  async refreshVehicleDataFromDvla(vehicle: Vehicle) {
    const combinedData = await DvlaService.getCompleteVehicleData(
      vehicle.registration_number,
    );

    const motEngineSize = combinedData?.motData?.engineSize
      ? parseInt(combinedData.motData.engineSize, 10)
      : null;

    const updatedVehicle = await this.prisma.vehicle.update({
      where: {
        id: vehicle.id,
      },
      data: {
        mot_last_checked_at: new Date(),
        mot_expiry_date: combinedData?.dvlaData?.motExpiryDate
          ? new Date(combinedData.dvlaData.motExpiryDate)
          : vehicle.mot_expiry_date,
        make: combinedData?.dvlaData?.make ?? vehicle.make,
        model: combinedData?.motData?.model ?? vehicle.model,
        color: combinedData?.dvlaData?.colour ?? vehicle.color,
        fuel_type:
          combinedData?.dvlaData?.fuelType ??
          combinedData?.motData?.fuelType ??
          vehicle.fuel_type,
        engine_capacity:
          combinedData?.dvlaData?.engineCapacity ??
          (Number.isNaN(motEngineSize)
            ? vehicle.engine_capacity
            : motEngineSize),
        co2_emissions:
          combinedData?.dvlaData?.co2Emissions ?? vehicle.co2_emissions,
        mot_status: combinedData?.dvlaData?.motStatus ?? vehicle.mot_status,
        raw_mot_data: (combinedData?.motData as any) ?? vehicle.raw_mot_data,
        raw_dvla_data: (combinedData?.dvlaData as any) ?? vehicle.raw_dvla_data,
      },
    });

    await this.syncMotHistory(
      updatedVehicle.id,
      combinedData?.motData?.motTests,
    );
    return updatedVehicle;
  }

  private async syncMotHistory(
    vehicleId: string,
    motTests:
      | Array<{
          motTestNumber?: string;
          completedDate?: string;
          expiryDate?: string;
          motTestResult?: string;
          odometerValue?: string;
          odometerUnit?: string;
          odometerResultType?: string;
          registrationAtTimeOfTest?: string | null;
          rfrAndComments?: Array<{
            type?: string;
            text?: string;
            dangerous?: boolean;
          }>;
        }>
      | undefined,
  ) {
    if (!motTests?.length) return;

    await this.prisma.$transaction(async (tx) => {
      for (const test of motTests) {
        const testNumber = test.motTestNumber?.trim() || null;
        const completedDate = test.completedDate
          ? new Date(test.completedDate)
          : null;
        const defects = (test.rfrAndComments ?? []).map((comment) => ({
          type: comment.type ?? 'UNKNOWN',
          text: comment.text ?? '',
          dangerous: comment.dangerous ?? false,
          raw_data: comment,
        }));

        const existingReport = await tx.motHistory.findFirst({
          where: {
            vehicle_id: vehicleId,
            ...(testNumber
              ? { test_number: testNumber }
              : completedDate
                ? { test_date: completedDate }
                : {}),
          },
          include: {
            defects: true,
          },
          orderBy: {
            created_at: 'desc',
          },
        });

        const reportPayload = {
          test_number: testNumber,
          test_date: completedDate,
          expiry_date: test.expiryDate ? new Date(test.expiryDate) : null,
          status: test.motTestResult ?? null,
          odometer_value: test.odometerValue
            ? parseInt(test.odometerValue, 10)
            : null,
          odometer_unit: test.odometerUnit ?? null,
          odometer_result_type: test.odometerResultType ?? null,
          data_source: 'DVLA_MOT',
          registration_at_test: test.registrationAtTimeOfTest ?? null,
          raw_data: test as any,
        };

        if (!existingReport) {
          await tx.motHistory.create({
            data: {
              vehicle_id: vehicleId,
              ...reportPayload,
              defects: defects.length ? { create: defects } : undefined,
            },
          });
          continue;
        }

        const existingData = JSON.stringify(existingReport.raw_data ?? null);
        const incomingData = JSON.stringify(test ?? null);

        if (existingData === incomingData) {
          await tx.motHistory.update({
            where: { id: existingReport.id },
            data: reportPayload,
          });
          continue;
        }

        await tx.motHistory.update({
          where: { id: existingReport.id },
          data: {
            ...reportPayload,
            defects: {
              deleteMany: {},
              ...(defects.length ? { create: defects } : {}),
            },
          },
        });
      }
    });
  }
}
