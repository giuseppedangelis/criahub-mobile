import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { healthService } from "@/src/services/health";
import type {
  CreateExamInput,
  CreateHealthRecordInput,
  CreateVaccineInput,
  UpdateExamInput,
  UpdateHealthRecordInput,
  UpdateVaccineInput,
} from "@/src/types/domain";

export const healthKeys = {
  all: ["health"] as const,
  recordsByAnimal: (animalId: string) => [...healthKeys.all, "records", animalId] as const,
  vaccinesByAnimal: (animalId: string) => [...healthKeys.all, "vaccines", animalId] as const,
  examsByAnimal: (animalId: string) => [...healthKeys.all, "exams", animalId] as const,
  auditByAnimal: (animalId: string) => [...healthKeys.all, "audit", animalId] as const,
  summaryByHaras: (harasId: string) => [...healthKeys.all, "summary", harasId] as const,
};

export function useAnimalHealthRecords(animalId?: string | null) {
  return useQuery({
    queryKey: healthKeys.recordsByAnimal(animalId || ""),
    queryFn: () => healthService.listHealthRecords(animalId as string),
    enabled: Boolean(animalId),
  });
}

export function useAnimalVaccines(animalId?: string | null) {
  return useQuery({
    queryKey: healthKeys.vaccinesByAnimal(animalId || ""),
    queryFn: () => healthService.listVaccines(animalId as string),
    enabled: Boolean(animalId),
  });
}

export function useAnimalExams(animalId?: string | null) {
  return useQuery({
    queryKey: healthKeys.examsByAnimal(animalId || ""),
    queryFn: () => healthService.listExams(animalId as string),
    enabled: Boolean(animalId),
  });
}

export function useHealthSummary(harasId?: string | null) {
  return useQuery({
    queryKey: healthKeys.summaryByHaras(harasId || ""),
    queryFn: () => healthService.getHealthSummary(harasId as string),
    enabled: Boolean(harasId),
  });
}

export function useHealthAuditLogs(animalId?: string | null) {
  return useQuery({
    queryKey: healthKeys.auditByAnimal(animalId || ""),
    queryFn: () => healthService.listHealthAuditLogs(animalId as string),
    enabled: Boolean(animalId),
  });
}

function useInvalidateHealth() {
  const queryClient = useQueryClient();
  return async (animalId?: string, harasId?: string) => {
    await Promise.all([
      animalId
        ? queryClient.invalidateQueries({ queryKey: healthKeys.recordsByAnimal(animalId) })
        : Promise.resolve(),
      animalId
        ? queryClient.invalidateQueries({ queryKey: healthKeys.vaccinesByAnimal(animalId) })
        : Promise.resolve(),
      animalId
        ? queryClient.invalidateQueries({ queryKey: healthKeys.examsByAnimal(animalId) })
        : Promise.resolve(),
      animalId
        ? queryClient.invalidateQueries({ queryKey: healthKeys.auditByAnimal(animalId) })
        : Promise.resolve(),
      harasId
        ? queryClient.invalidateQueries({ queryKey: healthKeys.summaryByHaras(harasId) })
        : Promise.resolve(),
    ]);
  };
}

export function useCreateHealthRecordMutation() {
  const invalidate = useInvalidateHealth();
  return useMutation({
    mutationFn: (input: CreateHealthRecordInput) => healthService.createHealthRecord(input),
    onSuccess: (data) => invalidate(data.animal_id, data.haras_id),
  });
}

export function useCreateVaccineMutation() {
  const invalidate = useInvalidateHealth();
  return useMutation({
    mutationFn: (input: CreateVaccineInput) => healthService.createVaccine(input),
    onSuccess: (data) => invalidate(data.animal_id, data.haras_id),
  });
}

export function useCreateExamMutation() {
  const invalidate = useInvalidateHealth();
  return useMutation({
    mutationFn: (input: CreateExamInput) => healthService.createExam(input),
    onSuccess: (data) => invalidate(data.animal_id, data.haras_id),
  });
}

export function useUpdateHealthRecordMutation() {
  const invalidate = useInvalidateHealth();
  return useMutation({
    mutationFn: (input: UpdateHealthRecordInput) => healthService.updateHealthRecord(input),
    onSuccess: (data) => invalidate(data.animal_id, data.haras_id),
  });
}

export function useDeleteHealthRecordMutation() {
  const invalidate = useInvalidateHealth();
  return useMutation({
    mutationFn: (id: string) => healthService.deleteHealthRecord(id),
    onSuccess: (data) => invalidate(data.animal_id, data.haras_id),
  });
}

export function useUpdateVaccineMutation() {
  const invalidate = useInvalidateHealth();
  return useMutation({
    mutationFn: (input: UpdateVaccineInput) => healthService.updateVaccine(input),
    onSuccess: (data) => invalidate(data.animal_id, data.haras_id),
  });
}

export function useDeleteVaccineMutation() {
  const invalidate = useInvalidateHealth();
  return useMutation({
    mutationFn: (id: string) => healthService.deleteVaccine(id),
    onSuccess: (data) => invalidate(data.animal_id, data.haras_id),
  });
}

export function useUpdateExamMutation() {
  const invalidate = useInvalidateHealth();
  return useMutation({
    mutationFn: (input: UpdateExamInput) => healthService.updateExam(input),
    onSuccess: (data) => invalidate(data.animal_id, data.haras_id),
  });
}

export function useDeleteExamMutation() {
  const invalidate = useInvalidateHealth();
  return useMutation({
    mutationFn: (id: string) => healthService.deleteExam(id),
    onSuccess: (data) => invalidate(data.animal_id, data.haras_id),
  });
}
