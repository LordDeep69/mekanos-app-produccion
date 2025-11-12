import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// import { GraphQLModule } from '@nestjs/graphql';
// import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EquiposModule } from './equipos/equipos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '../../.env'), // ← Path absoluto al .env
      // validate: validateEnv, // ← TODO: Reactivar después de validar que carga el .env
    }),
    // GraphQL temporalmente desactivado - necesitamos al menos un resolver
    // GraphQLModule.forRoot<ApolloDriverConfig>({
    //   driver: ApolloDriver,
    //   autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
    //   sortSchema: true,
    //   playground: true,
    //   introspection: true,
    //   formatError: (error) => ({
    //     message: error.message,
    //     code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
    //     timestamp: new Date().toISOString(),
    //   }),
    // }),
    PrismaModule, // ← PrismaService disponible globalmente
    AuthModule, // ← Auth JWT con usuarios mock
    EquiposModule, // ← Módulo de Equipos con DDD/CQRS
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
