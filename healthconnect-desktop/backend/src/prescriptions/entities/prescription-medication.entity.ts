import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Prescription } from './prescription.entity';

@Entity({ name: 'prescription_medications' })
export class PrescriptionMedication extends BaseEntity {
  @ManyToOne(() => Prescription, (prescription) => prescription.medications)
  prescription: Prescription;

  @Column({ length: 160 })
  drugName: string;

  @Column({ length: 64 })
  strength: string;

  @Column({ length: 64 })
  dosage: string;

  @Column({ length: 64 })
  frequency: string;

  @Column({ length: 64 })
  duration: string;

  @Column({ type: 'text', nullable: true })
  instructions?: string;
}
