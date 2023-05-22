// import { DataSource } from 'typeorm';

// export const databaseProviders = [
//   {
//     provide: 'DATA_SOURCE',
//     useFactory: async () => {
//       const dataSource = new DataSource({
//         type: 'mssql',
//         host: 'vppprsql3',
//         port: 1574,
//         username: 'user-synergies',
//         password: '#user-synergies@VPPPRSQL3#007',
//         database: 'SYNERGIES_PREPRODUCTION',
//         entities: [
//             __dirname + '/../**/*.entity{.ts,.js}',
//         ],
//         extra: {
//             trustServerCertificate: true,
//         },
//         logging: true,
//         synchronize: true,
//       });

//       return dataSource.initialize();
//     },
//   },
// ];