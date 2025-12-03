import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Pharmacy } from './entities/pharmacy.entity';
import { Hospital } from './entities/hospital.entity';
import { LocationQueryDto } from './dto/location-query.dto';
import { HospitalQueryDto } from './dto/hospital-query.dto';

@Injectable()
export class LocationsService implements OnModuleInit {
  private desktopDataSource: DataSource | null = null;

  constructor(
    @InjectRepository(Pharmacy) private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(Hospital) private readonly hospitalRepo: Repository<Hospital>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.initializeDesktopConnection();
  }

  private async initializeDesktopConnection() {
    try {
      // Desktop database connection
      const desktopDbUrl = this.configService.get<string>(
        'DESKTOP_DATABASE_URL',
        'postgres://hc:hcpassword@localhost:5434/healthconnect_desktop',
      );

      console.log(`🔌 Attempting to connect to desktop database: ${desktopDbUrl.replace(/:[^:@]+@/, ':****@')}`);

      this.desktopDataSource = new DataSource({
        type: 'postgres',
        url: desktopDbUrl,
        ssl: false,
      });

      await this.desktopDataSource.initialize();
      console.log('✅ Connected to desktop database for pharmacy data');

      // Test query to verify connection and check pharmacy count
      try {
        const countResult = await this.desktopDataSource.query('SELECT COUNT(*) as count FROM pharmacies');
        const totalCount = countResult[0]?.count || 0;
        console.log(`📊 Total pharmacies in desktop database: ${totalCount}`);

        // Check pharmacies with valid coordinates
        const withCoordsResult = await this.desktopDataSource.query(
          `SELECT COUNT(*) as count FROM pharmacies 
           WHERE latitude IS NOT NULL 
           AND longitude IS NOT NULL 
           AND latitude != 0 
           AND longitude != 0`
        );
        const withCoordsCount = withCoordsResult[0]?.count || 0;
        console.log(`📍 Pharmacies with valid coordinates: ${withCoordsCount}`);

        // Get sample pharmacy data
        if (withCoordsCount > 0) {
          const sampleResult = await this.desktopDataSource.query(
            `SELECT id, name, latitude, longitude, address, "contactPhone", region, district 
             FROM pharmacies 
             WHERE latitude IS NOT NULL 
             AND longitude IS NOT NULL 
             AND latitude != 0 
             AND longitude != 0 
             LIMIT 3`
          );
          console.log('📋 Sample pharmacies with coordinates:');
          sampleResult.forEach((pharmacy: any, index: number) => {
            console.log(`  ${index + 1}. ${pharmacy.name} - Lat: ${pharmacy.latitude}, Lng: ${pharmacy.longitude}, Address: ${pharmacy.address}`);
          });
        }
      } catch (testError) {
        console.error('⚠️ Error testing database connection:', testError);
      }
    } catch (error) {
      console.error('❌ Could not connect to desktop database:', error);
      console.error('❌ Error details:', error.message);
      console.warn('⚠️ Using mobile database only');
      this.desktopDataSource = null;
    }
  }

  async findPharmacies(query: LocationQueryDto) {
    let pharmacies: any[] = [];

    console.log(`🔍 Searching pharmacies at lat: ${query.latitude}, lng: ${query.longitude}, radius: ${query.radius}km`);

    // Try to fetch from desktop database first
    if (this.desktopDataSource?.isInitialized) {
      try {
        // First, check what columns actually exist in the pharmacies table
        try {
          const columnInfo = await this.desktopDataSource.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'pharmacies' 
            AND column_name IN ('contactPhone', 'contact_phone', 'contactEmail', 'contact_email', 'isPartner', 'is_partner', 'isVerified', 'is_verified')
            ORDER BY column_name
          `);
          console.log('📋 Available pharmacy table columns:', columnInfo);
        } catch (colError) {
          console.log('⚠️ Could not check column info:', colError);
        }

        // Query the pharmacies table from desktop database
        // Use camelCase column names as they are in the database
        // Join with organizations to get logoUrl
        let queryString = `
          SELECT 
            p.id,
            p.name,
            p.address,
            p."contactPhone" as phone,
            p.latitude,
            p.longitude,
            p."isPartner",
            p."isVerified",
            p.region,
            p.district,
            p."contactEmail" as email,
            o.logo_url as logo_url
          FROM pharmacies p
          LEFT JOIN organizations o ON o.id = p."organization_id"
          WHERE p.latitude IS NOT NULL 
            AND p.longitude IS NOT NULL
            AND p.latitude != 0
            AND p.longitude != 0
        `;
        const params: any[] = [];

        if (query.search) {
          queryString += ` AND LOWER(name) LIKE LOWER($${params.length + 1})`;
          params.push(`%${query.search}%`);
        }

        console.log(`📊 Executing query: ${queryString}`);
        console.log(`📊 Query params:`, params);

        const desktopPharmacies = await this.desktopDataSource.query(
          queryString,
          params,
        );

        console.log(`📦 Found ${desktopPharmacies.length} pharmacies in desktop database (before distance filter)`);
        
        if (desktopPharmacies.length > 0) {
          console.log('✅ Sample pharmacy data:', JSON.stringify(desktopPharmacies[0], null, 2));
          // Log first few pharmacies with their coordinates
          desktopPharmacies.slice(0, 3).forEach((p: any, i: number) => {
            console.log(`  ${i + 1}. ${p.name} - Lat: ${p.latitude}, Lng: ${p.longitude}`);
          });
        } else {
          console.log('⚠️ No pharmacies found matching query criteria');
          // Test if table exists and has data
          try {
            const testQuery = await this.desktopDataSource.query('SELECT COUNT(*) as count FROM pharmacies');
            const totalCount = testQuery[0]?.count || 0;
            console.log(`📊 Total pharmacies in database: ${totalCount}`);
            
            if (totalCount > 0) {
              // Check why they're not being returned
              const allPharms = await this.desktopDataSource.query('SELECT id, name, latitude, longitude FROM pharmacies LIMIT 5');
              console.log('📋 Sample pharmacies (all):', allPharms.map((p: any) => ({
                name: p.name,
                hasLat: p.latitude != null,
                hasLng: p.longitude != null,
                lat: p.latitude,
                lng: p.longitude,
              })));
            }
          } catch (testError) {
            console.error('❌ Error checking database:', testError);
          }
        }

        pharmacies = desktopPharmacies.map((p: any) => ({
          id: p.id,
          name: p.name,
          address: p.address || `${p.region || ''}, ${p.district || ''}`.trim() || 'Address not available',
          phone: p.phone || null,
          latitude: parseFloat(p.latitude),
          longitude: parseFloat(p.longitude),
          isPartner: p.isPartner || false,
          isVerified: p.isVerified || false,
          isOpen: true, // Default to open, can be enhanced later
          rating: null, // Can be added later if ratings are tracked
          openingHours: null, // Can be added later if hours are tracked
          imageUrl: p.logo_url || null, // Use organization logo if available
          services: null, // Can be populated from pharmacy_services table if needed
          metadata: {
            region: p.region,
            district: p.district,
            email: p.email,
            isVerified: p.isVerified || false,
            logoUrl: p.logo_url || null,
          },
          distanceKm: this.calculateDistance(
            query.latitude,
            query.longitude,
            parseFloat(p.latitude),
            parseFloat(p.longitude),
          ),
        }));
      } catch (error) {
        console.error('Error fetching from desktop database:', error);
      }
    }

    // Fallback to mobile database if desktop fails or returns no results
    if (pharmacies.length === 0) {
      const mobilePharmacies = await this.pharmacyRepo.find();

      // Only use pharmacies that have valid coordinates
      pharmacies = mobilePharmacies
        .filter(
          (pharmacy) =>
            pharmacy.latitude !== null &&
            pharmacy.latitude !== undefined &&
            pharmacy.longitude !== null &&
            pharmacy.longitude !== undefined,
        )
        .map((pharmacy) => ({
          ...pharmacy,
          distanceKm: this.calculateDistance(
            query.latitude,
            query.longitude,
            pharmacy.latitude,
            pharmacy.longitude,
          ),
        }));
    }

    console.log(`📊 Total pharmacies before filtering: ${pharmacies.length}`);
    
    const filteredPharmacies = pharmacies
      .filter((pharmacy) => {
        const withinRadius = pharmacy.distanceKm <= query.radius;
        if (!withinRadius) {
          console.log(`📍 Pharmacy "${pharmacy.name}" is ${pharmacy.distanceKm.toFixed(2)}km away (outside ${query.radius}km radius)`);
        }
        return withinRadius;
      })
      .filter((pharmacy) =>
        query.search
          ? pharmacy.name.toLowerCase().includes(query.search.toLowerCase())
          : true,
      )
      .sort((a, b) => a.distanceKm - b.distanceKm);

    console.log(`✅ Returning ${filteredPharmacies.length} pharmacies within ${query.radius}km radius`);
    if (filteredPharmacies.length > 0) {
      console.log(`📍 Nearest pharmacy: "${filteredPharmacies[0].name}" at ${filteredPharmacies[0].distanceKm.toFixed(2)}km`);
    }
    return filteredPharmacies;
  }

  async findHospitals(query: HospitalQueryDto) {
    let hospitals: any[] = [];

    // Try to fetch from desktop database first (hospitals are organizations with type='hospital')
    if (this.desktopDataSource?.isInitialized) {
      try {
        // Query organizations with type='hospital' and their primary pharmacy locations
        // Note: organizations table uses snake_case (contact_email, contact_phone)
        //       pharmacies table uses camelCase (contactEmail, contactPhone)
        const queryString = `
          SELECT 
            o.id,
            o.name,
            o.contact_phone as org_phone,
            o.contact_email as org_email,
            o.logo_url as logo_url,
            p.address,
            p."contactPhone" as phone,
            p."contactEmail" as email,
            p.latitude,
            p.longitude,
            p.region,
            p.district,
            p.country
          FROM organizations o
          INNER JOIN pharmacies p ON p."organization_id" = o.id
          WHERE o.type = 'hospital'
            AND p.latitude IS NOT NULL 
            AND p.longitude IS NOT NULL
            AND p.latitude != 0
            AND p.longitude != 0
          ORDER BY o.created_at ASC
        `;

        const desktopHospitals = await this.desktopDataSource.query(queryString);

        console.log(`📦 Found ${desktopHospitals.length} hospitals in desktop database (before distance filter)`);
        
        hospitals = desktopHospitals.map((h: any) => ({
          id: h.id,
          name: h.name,
          address: h.address || `${h.region || ''}, ${h.district || ''}`.trim() || 'Address not available',
          phone: h.phone || h.org_phone || null,
          latitude: parseFloat(h.latitude),
          longitude: parseFloat(h.longitude),
          hasEmergency: false, // Default, can be enhanced later
          isOpen: true,
          rating: null,
          openingHours: null,
          imageUrl: h.logo_url || null, // Use organization logo if available
          services: null,
          metadata: {
            region: h.region,
            district: h.district,
            country: h.country,
            email: h.email || h.org_email,
            logoUrl: h.logo_url || null,
          },
          distanceKm: this.calculateDistance(
            query.latitude,
            query.longitude,
            parseFloat(h.latitude),
            parseFloat(h.longitude),
          ),
        }));
        
        if (hospitals.length > 0) {
          console.log('✅ Sample hospital data:', JSON.stringify(hospitals[0], null, 2));
        }
      } catch (error) {
        console.error('Error fetching hospitals from desktop database:', error);
      }
    }

    // Fallback to mobile database if desktop fails or returns no results
    if (hospitals.length === 0) {
      const mobileHospitals = await this.hospitalRepo.find();
      const hasEmergency =
        query.has_emergency === undefined ? undefined : query.has_emergency === 'true';

      hospitals = mobileHospitals
        .filter((hospital) => (hasEmergency !== undefined ? hospital.hasEmergency === hasEmergency : true))
        .map((hospital) => ({
          ...hospital,
          distanceKm: this.calculateDistance(
            query.latitude,
            query.longitude,
            hospital.latitude,
            hospital.longitude,
          ),
        }));
    }

    return hospitals
      .filter((hospital) => hospital.distanceKm <= query.radius)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const earthRadius = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  }

  private deg2rad(deg: number) {
    return (deg * Math.PI) / 180;
  }
}

