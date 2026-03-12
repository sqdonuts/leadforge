// backend/agents/pipelineWorker.js

class PipelineWorker {
  constructor({ searchId, category, location, limit, linkedinCreds, socket }) {
    this.searchId = searchId;
    this.category = category;
    this.location = location;
    this.limit = limit;
    this.linkedinCreds = linkedinCreds;
    this.socket = socket;
    this.cancelled = false;
  }

  async run() {
    this.socket.emit("pipeline_status", {
      searchId: this.searchId,
      message: "Pipeline started"
    });

    // Fake processing for now
    await new Promise(r => setTimeout(r, 2000));

    this.socket.emit("pipeline_complete", {
      searchId: this.searchId,
      message: "Pipeline finished"
    });
  }

  cancel() {
    this.cancelled = true;
  }
}

module.exports = { PipelineWorker };