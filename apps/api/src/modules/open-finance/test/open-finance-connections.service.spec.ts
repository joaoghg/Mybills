import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AlreadyExistsError } from 'src/common/errors/already-exists.error';
import { InvalidArgumentError } from 'src/common/errors/invalid-argument.error';
import { NotFoundError } from 'src/common/errors/not-found.error';
import { OpenFinanceConnectionsService } from '../open-finance-connections.service';
import { PLUGGY_CLIENT_PORT } from '../providers/pluggy.constants';
import { PluggyClientPort } from '../providers/pluggy-client.port';
import { OpenFinanceConnectionRepository } from '../repositories/open-finance-connection.repository';
import { OpenFinanceConnectionOutput } from '@mybills/dtos';

describe('OpenFinanceConnectionsService', () => {
  let service: OpenFinanceConnectionsService;
  let connections: jest.Mocked<OpenFinanceConnectionRepository>;
  let pluggyClient: jest.Mocked<Pick<PluggyClientPort, 'fetchItem' | 'deleteItem'>>;

  const userId = '2cea6915-f57e-4ba4-84ec-08f47e4eb7f9';
  const itemId = '11111111-1111-4111-8111-111111111111';
  const connection: OpenFinanceConnectionOutput = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    userId,
    itemId,
    connectorId: 200,
    status: 'ACTIVE',
    itemStatus: 'UPDATED',
    institutionName: 'Meu Pluggy',
    institutionLogoUrl: null,
    products: [],
    lastSuccessfulSyncAt: null,
    lastSyncAttemptAt: null,
    error: null,
    createdAt: '2026-08-17T00:00:00.000Z',
    updatedAt: '2026-08-17T00:00:00.000Z'
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenFinanceConnectionsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(true)
          }
        },
        {
          provide: PLUGGY_CLIENT_PORT,
          useValue: {
            fetchItem: jest.fn(),
            deleteItem: jest.fn()
          }
        },
        {
          provide: 'OpenFinanceConnectionRepository',
          useValue: {
            findByItemId: jest.fn(),
            findByIdAndUserId: jest.fn(),
            findAllByUserId: jest.fn(),
            create: jest.fn(),
            disconnect: jest.fn(),
            findSyncRunByIdAndUserId: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get(OpenFinanceConnectionsService);
    connections = module.get('OpenFinanceConnectionRepository');
    pluggyClient = module.get(PLUGGY_CLIENT_PORT);
  });

  it('should register a Connector 200 item for the current user', async () => {
    connections.findByItemId.mockResolvedValue(null);
    pluggyClient.fetchItem.mockResolvedValue({
      id: itemId,
      connector: { id: 200, name: 'Meu Pluggy', imageUrl: 'https://example.com/logo.png' },
      status: 'UPDATED'
    } as never);
    connections.create.mockResolvedValue(connection);

    const result = await service.register(userId, { itemId });

    expect(result.connectorId).toBe(200);
    expect(connections.create).toHaveBeenCalled();
  });

  it('should throw InvalidArgumentError if the connector is not 200', async () => {
    connections.findByItemId.mockResolvedValue(null);
    pluggyClient.fetchItem.mockResolvedValue({
      id: itemId,
      connector: { id: 201, name: 'Other', imageUrl: '' },
      status: 'UPDATED'
    } as never);

    await expect(service.register(userId, { itemId })).rejects.toThrow(InvalidArgumentError);
    expect(connections.create).not.toHaveBeenCalled();
  });

  it('should throw AlreadyExistsError if the item is already registered', async () => {
    connections.findByItemId.mockResolvedValue(connection);

    await expect(service.register(userId, { itemId })).rejects.toThrow(AlreadyExistsError);
    expect(pluggyClient.fetchItem).not.toHaveBeenCalled();
  });

  it('should complete local disconnection when the remote item is already gone', async () => {
    connections.findByIdAndUserId.mockResolvedValue(connection);
    pluggyClient.deleteItem.mockRejectedValue(new Error('gone'));
    pluggyClient.fetchItem.mockRejectedValue(new Error('gone'));
    connections.disconnect.mockResolvedValue({ ...connection, status: 'DISCONNECTED' });

    await service.disconnect(connection.id, userId);

    expect(connections.disconnect).toHaveBeenCalledWith(connection.id);
  });

  it('should throw NotFoundError when listing sync runs for another user', async () => {
    connections.findByIdAndUserId.mockResolvedValue(null);

    await expect(
      service.getSyncRun(connection.id, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', userId)
    ).rejects.toThrow(NotFoundError);
    expect(connections.findSyncRunByIdAndUserId).not.toHaveBeenCalled();
  });
});
