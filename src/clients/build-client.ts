import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces.js';
import { IBuildApi } from 'azure-devops-node-api/BuildApi.js';
import { PagedList } from 'azure-devops-node-api/interfaces/common/VSSInterfaces.js';
import { AzureDevOpsBaseClient } from './ado-base-client.js';
import { ApiResult } from '../types/index.js';

export class BuildClient extends AzureDevOpsBaseClient {
  private buildApi: IBuildApi | null = null;

  protected async ensureInitialized(): Promise<void> {
    if (!this.buildApi) {
      this.buildApi = await this.connection.getBuildApi();
    }
  }

  async getBuildTimeline(
    buildId: number,
    timelineId?: string
  ): Promise<ApiResult<BuildInterfaces.Timeline>> {
    await this.ensureInitialized();
    
    return this.handleApiCall(
      'getBuildTimeline',
      async () => {
        const timeline = await this.buildApi!.getBuildTimeline(
          this.config.project,
          buildId,
          timelineId
        );
        
        if (!timeline) {
          throw new Error(`Timeline not found for build ${buildId}`);
        }
        
        return timeline;
      }
    );
  }

  async getBuilds(
    options: {
      definitionIds?: number[];
      definitionNameFilter?: string;
      statusFilter?: BuildInterfaces.BuildStatus;
      resultFilter?: BuildInterfaces.BuildResult;
      branchName?: string;
      top?: number;
      continuationToken?: string;
    } = {}
  ): Promise<ApiResult<PagedList<BuildInterfaces.Build>>> {
    await this.ensureInitialized();
    
    return this.handleApiCall(
      'getBuilds',
      async () => {
        // If definitionNameFilter is provided, we need to first get matching definitions
        let definitionIds = options.definitionIds;
        
        if (options.definitionNameFilter && !definitionIds) {
          // Note: getDefinitions now automatically adds wildcards
          const definitionsResult = await this.getDefinitions({
            nameFilter: options.definitionNameFilter
          });
          
          if (definitionsResult.success && definitionsResult.data.length > 0) {
            definitionIds = definitionsResult.data.map(d => d.id!);
          } else {
            // No matching definitions found
            const emptyResult: any = [];
            emptyResult.continuationToken = undefined;
            return emptyResult;
          }
        }
        
        const result = await this.buildApi!.getBuilds(
          this.config.project,
          definitionIds,
          undefined, // queues
          undefined, // buildNumber
          undefined, // minTime
          undefined, // maxTime
          undefined, // requestedFor
          undefined, // reasonFilter
          options.statusFilter,
          options.resultFilter,
          undefined, // tagFilters
          undefined, // properties
          options.top,
          options.continuationToken,
          undefined, // maxBuildsPerDefinition
          undefined, // deletedFilter
          BuildInterfaces.BuildQueryOrder.FinishTimeDescending,
          options.branchName
        );
        
        return result;
      }
    );
  }

  async getDefinitions(
    options: {
      nameFilter?: string;
      top?: number;
      continuationToken?: string;
    } = {}
  ): Promise<ApiResult<PagedList<BuildInterfaces.BuildDefinitionReference>>> {
    await this.ensureInitialized();
    
    return this.handleApiCall(
      'getDefinitions',
      async () => {
        // Wrap nameFilter with wildcards for intuitive partial matching
        const nameFilter = options.nameFilter 
          ? (options.nameFilter.includes('*') ? options.nameFilter : `*${options.nameFilter}*`)
          : undefined;
        
        // If we have a continuation token, it's our client-side pagination offset
        const offset = options.continuationToken ? parseInt(options.continuationToken, 10) : 0;
        const limit = options.top || 50;
        
        // Fetch more than requested to determine if there are more results
        // This is a workaround for the SDK not returning continuation tokens
        const fetchLimit = offset + limit + 1;
        
        const result = await this.buildApi!.getDefinitions(
          this.config.project,
          nameFilter,
          undefined, // repositoryId
          undefined, // repositoryType
          BuildInterfaces.DefinitionQueryOrder.LastModifiedDescending,
          fetchLimit,
          undefined  // Don't pass continuation token to API as it doesn't work properly
        );
        
        // Implement client-side pagination
        const allDefinitions = result as BuildInterfaces.BuildDefinitionReference[];
        const paginatedDefinitions = allDefinitions.slice(offset, offset + limit);
        const hasMore = allDefinitions.length > offset + limit;
        
        // Create a PagedList-like result
        const pagedResult = Object.assign([], paginatedDefinitions) as PagedList<BuildInterfaces.BuildDefinitionReference>;
        pagedResult.continuationToken = hasMore ? String(offset + limit) : undefined;
        
        return pagedResult;
      }
    );
  }
}