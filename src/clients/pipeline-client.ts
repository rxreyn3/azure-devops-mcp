import * as PipelinesInterfaces from 'azure-devops-node-api/interfaces/PipelinesInterfaces.js';
import { IPipelinesApi } from 'azure-devops-node-api/PipelinesApi.js';
import { AzureDevOpsBaseClient } from './ado-base-client.js';
import { Config } from '../config.js';
import { ApiResult, PipelineRunResult } from '../types/index.js';

export class PipelineClient extends AzureDevOpsBaseClient {
  private pipelinesApi: IPipelinesApi | undefined;

  constructor(config: Config) {
    super(config);
  }

  protected async ensureInitialized(): Promise<void> {
    if (!this.pipelinesApi) {
      this.pipelinesApi = await this.connection.getPipelinesApi();
    }
  }

  async runPipeline(
    options: {
      pipelineId: number;
      pipelineVersion?: number;
      sourceBranch?: string;
      templateParameters?: { [key: string]: any };
      stagesToSkip?: string[];
    }
  ): Promise<ApiResult<PipelineRunResult>> {
    await this.ensureInitialized();
    
    return this.handleApiCall(
      'runPipeline',
      async () => {
        // Build the run parameters
        const runParameters: PipelinesInterfaces.RunPipelineParameters = {
          templateParameters: options.templateParameters,
          stagesToSkip: options.stagesToSkip
        };

        // Add resources if sourceBranch is specified
        if (options.sourceBranch) {
          runParameters.resources = {
            repositories: {
              self: {
                refName: options.sourceBranch
              }
            }
          };
        }
        
        const run = await this.pipelinesApi!.runPipeline(
          runParameters,
          this.config.project,
          options.pipelineId,
          options.pipelineVersion
        );
        
        if (!run) {
          throw new Error('Failed to run pipeline - no response from API');
        }
        
        // Map to our result type
        const result: PipelineRunResult = {
          id: run.id!,
          pipelineId: run.pipeline?.id || options.pipelineId,
          pipelineName: run.pipeline?.name || '',
          state: run.state?.toString() || 'unknown',
          result: run.result?.toString(),
          createdDate: run.createdDate!,
          finishedDate: run.finishedDate,
          url: run.url || '',
          name: run.name || '',
          templateParameters: options.templateParameters
        };
        
        return result;
      }
    );
  }

  async getPipelineRun(
    pipelineId: number,
    runId: number
  ): Promise<ApiResult<PipelinesInterfaces.Run>> {
    await this.ensureInitialized();
    
    return this.handleApiCall(
      'getPipelineRun',
      async () => {
        const run = await this.pipelinesApi!.getRun(
          this.config.project,
          pipelineId,
          runId
        );
        
        if (!run) {
          throw new Error('Pipeline run not found');
        }
        
        return run;
      }
    );
  }

  async listPipelineRuns(
    pipelineId: number,
    top?: number
  ): Promise<ApiResult<PipelinesInterfaces.Run[]>> {
    await this.ensureInitialized();
    
    return this.handleApiCall(
      'listPipelineRuns',
      async () => {
        const runs = await this.pipelinesApi!.listRuns(
          this.config.project,
          pipelineId
        );
        
        return runs || [];
      }
    );
  }
}